import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from math import radians, sin, cos, sqrt, asin
from flask import Flask, request, jsonify
import requests
from update_donor_status import update_donor_record # <-- You would import it here

# --- Configuration Update in app.py ---
# CPASS_URL is now the messaging endpoint# --- Configuration Update in app.py ---
CPASS_URL = "https://api.twilio.com/2010-04-01/Accounts/AC7f54ae9012bfa1296d94fa3b73bc4f3c/Messages.json" # Make sure YOUR_ACCOUNT_SID is correct here too!

# Replace with your actual credentials from the Twilio Console
AUTH_SID = "AC7f54ae9012bfa1296d94fa3b73bc4f3c"  # <-- Your REAL Account SID
AUTH_TOKEN = "7ea2777041e3341ceeb9978f36fbfc7e" # <-- Your REAL Auth Token (one long string)

# Define the message template for outreach
SMS_MESSAGE_TEMPLATE = (
    "URGENT BLOOD DONOR NEEDED. Your blood group ({blood_group}) is urgently "
    "required at a hospital near your location. Reply YES to accept or NO to decline. "
    "Reply STOP to opt out. [Donor ID: {donor_id}]"
)


# --- API Setup ---
app = Flask(__name__)

# --- Global Variables for Loaded Resources ---
# These will hold the dataframes and models after load_resources() runs.
blood_df = None
blood_model = None
blood_features = None
organ_df = None

# --- Resource Loading Function (The Fix for before_first_request) ---
def load_resources():
    """Loads all necessary data and models into memory once."""
    global blood_df, blood_model, blood_features
    global organ_df

    print("Loading resources...")
    try:
        # Blood Donation Resources
        blood_df = pd.read_csv('final_indian_blood_donor_dataset.csv')
        blood_model = joblib.load('indian_donor_likelihood_model_v3.joblib')
        blood_features = joblib.load('indian_model_features_v3.joblib')
        
        # Organ Donation Resources
        organ_df = pd.read_csv('indian_organ_donor_dataset.csv')
        
        # Pre-process blood donor data
        if 'last_donation_date' not in blood_df.columns:
            blood_df['last_donation_date'] = blood_df['created_at']
        blood_df['last_donation_date'] = pd.to_datetime(blood_df['last_donation_date'])
        
        print("All resources loaded successfully.")
    except Exception as e:
        # Critical error if files are missing or corrupted
        print(f"FATAL ERROR LOADING RESOURCES: {e}")
        raise

# --- Utility Functions (Haversine Distance) ---

def haversine(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance in kilometers using numpy for vectorization."""
    R = 6371  # Earth radius in kilometers

    # Use np.radians and np.sin/cos/sqrt for vectorization across Pandas Series
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat/2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2.0)**2
    c = 2 * np.arcsin(np.sqrt(a))
    
    return R * c

# --- Blood Donor Matching Logic ---

def find_top_blood_donors(blood_group, hospital_lat, hospital_long, today_date, top_n=5):
    """Finds top blood donors based on cooldown and suitability score."""
    
    # Use global data loaded previously
    df_filtered = blood_df[blood_df['blood_group'] == blood_group].copy()
    if df_filtered.empty: return pd.DataFrame()

    # Cooldown Filter (Must be > 30 days since last donation)
    COOLDOWN_PERIOD_DAYS = 30
    df_filtered['days_since_last_donation'] = (today_date - df_filtered['last_donation_date']).dt.days
    
    df_eligible = df_filtered[
        df_filtered['days_since_last_donation'] > COOLDOWN_PERIOD_DAYS
    ].copy()
    
    if df_eligible.empty: return pd.DataFrame()

    # 1. Prepare Features for ML Model Prediction
    X = pd.DataFrame(0, index=df_eligible.index, columns=blood_features)
    for col in ['months_since_first_donation', 'number_of_donation', 'pints_donated', 'latitude', 'longitude']:
        if col in X.columns: X[col] = df_eligible[col]
            
    # One-hot encoding for city
    for index, row in df_eligible.iterrows():
        city_col = f"city_{row['city']}"
        if city_col in X.columns: X.loc[index, city_col] = 1
    
    # 2. Predict Likelihood and Calculate Score
    df_eligible['likelihood'] = blood_model.predict_proba(X)[:, 1]
    df_eligible['distance_km'] = haversine(df_eligible['latitude'], df_eligible['longitude'], hospital_lat, hospital_long)
    df_eligible['suitability_score'] = df_eligible['likelihood'] / (df_eligible['distance_km'] + 1)
    
    df_ranked = df_eligible.sort_values(by='suitability_score', ascending=False)
    
    result_cols = ['donor_id', 'name', 'latitude', 'longitude', 'contact_number', 'distance_km', 'likelihood', 'suitability_score']
    return df_ranked[result_cols].head(top_n)

# --- Organ Match Ranking Logic ---

def find_best_organ_match(required_organ, recipient_lat, recipient_long, current_time_utc, top_n=5):
    """Ranks deceased organ donors based on HLA score, proximity, and viability."""
    
    MAX_VIABILITY_HOURS = {'Kidney': 12, 'Heart': 4, 'Liver': 10, 'Lung': 6}.get(required_organ, 12)
    
    # Use global data loaded previously
    df_eligible = organ_df[
        (organ_df['organ_available'] == required_organ) & 
        (organ_df['donor_type'] == 'Deceased')
    ].copy()
    
    if df_eligible.empty: return pd.DataFrame()
        
    df_eligible['time_available_utc'] = pd.to_datetime(df_eligible['time_available_utc'])
    
    time_elapsed = current_time_utc - df_eligible['time_available_utc']
    df_eligible['hours_elapsed'] = time_elapsed.dt.total_seconds() / 3600
    df_eligible = df_eligible[df_eligible['hours_elapsed'] < MAX_VIABILITY_HOURS].copy()
    
    if df_eligible.empty: return pd.DataFrame()

    # Calculate Distance & Penalties
    df_eligible['distance_km'] = df_eligible.apply(
        lambda row: haversine(row['latitude'], row['longitude'], recipient_lat, recipient_long), axis=1
    )
    df_eligible['time_penalty_factor'] = 1 - (df_eligible['hours_elapsed'] / MAX_VIABILITY_HOURS)
    
    # Score = (HLA Match * Size Factor * Time Penalty) / (Distance + 1)
    df_eligible['suitability_score'] = (
        df_eligible['hla_match_score'] * df_eligible['tissue_size_factor'] * df_eligible['time_penalty_factor']
    ) / (df_eligible['distance_km'] + 1)
    
    df_ranked = df_eligible.sort_values(by='suitability_score', ascending=False)
    
    # NOTE: Using 'hospital_contact_number'
    result_cols = ['name', 'latitude', 'longitude', 'hospital_contact_number', 'hla_match_score', 'hours_elapsed', 'distance_km', 'suitability_score']
    return df_ranked[result_cols].head(top_n)

# --- API Endpoints ---

@app.route('/api/blood/find-donors', methods=['GET'])
def blood_donor_endpoint():
    """Endpoint for finding the top 5 blood donors."""
    
    # 1. Input Validation and Parsing
    try:
        blood_group = request.args.get('blood_group')
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if not blood_group or lat is None or lon is None:
            return jsonify({"error": "Missing required parameters: blood_group, lat, or lon"}), 400
            
    except Exception as e:
        return jsonify({"error": f"Invalid parameter format. Must be string for blood_group, float for lat/lon: {e}"}), 400

    # 2. Execute Logic
    results_df = find_top_blood_donors(blood_group, lat, lon, today, top_n=5)
    
    # 3. Format Response
    if results_df.empty:
        return jsonify({"message": "No eligible blood donors found."}), 200
        
    return jsonify(results_df.to_dict('records'))


@app.route('/api/organ/find-matches', methods=['GET'])
def organ_match_endpoint():
    """Endpoint for finding the top 5 organ matches."""
    
    # 1. Input Validation and Parsing
    try:
        organ = request.args.get('organ')
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        current_time_utc = datetime.utcnow() 
        
        if not organ or lat is None or lon is None:
            return jsonify({"error": "Missing required parameters: organ, lat, or lon"}), 400
            
    except Exception as e:
        return jsonify({"error": f"Invalid parameter format. Must be string for organ, float for lat/lon: {e}"}), 400

    # 2. Execute Logic
    results_df = find_best_organ_match(organ, lat, lon, current_time_utc, top_n=5)
    
    # 3. Format Response
    if results_df.empty:
        return jsonify({"message": f"No eligible organ matches found for {organ}. Check viability time."}), 200
        
    return jsonify(results_df.to_dict('records'))



# ... (all previous functions and imports are assumed to be above this) ...

@app.route('/api/blood/initiate-call', methods=['POST'])
def initiate_call_outreach():
    """Identifies top donors and initiates SMS outreach with failover."""
    
    # 1. Parse Input
    try:
        data = request.json
        blood_group = data['blood_group']
        lat = data['lat']
        lon = data['lon']
    except:
        return jsonify({"error": "Invalid or incomplete JSON input."}), 400

    # 2. Generate Ranked List
    today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    top_donors_df = find_top_blood_donors(blood_group, lat, lon, today, top_n=5)
    
    if top_donors_df.empty:
        return jsonify({"status": "failed", "reason": "No eligible donors found."}), 200

    # 3. Failover Loop and CPaaS Integration
    for index, donor in top_donors_df.iterrows():
        
        message_body = SMS_MESSAGE_TEMPLATE.format(
            blood_group=blood_group,
            donor_id=donor['donor_id'] # Use Donor ID for easy tracking in the reply
        )

        try:
            # --- CPaaS API Call (SMS Structure) ---
            response = requests.post(
                CPASS_URL,
                auth=(AUTH_SID, AUTH_TOKEN),
                data={
                    'From': '+18623552189',         # Your assigned CPaaS source number
                    'To': donor['contact_number'],  # Donor's number
                    'Body': message_body            # The text message content
                }
            )
            
            # --- Check Response and Log ---
            if response.status_code == 201: # Success code for message queued/sent
                print(f"SUCCESS: SMS initiated for {donor['name']} ({donor['contact_number']}).")
                
                # IMPORTANT: SMS confirmation is based on the donor's REPLY (a webhook),
                # but we treat successful SENDING as step 1 completion for the API.
                return jsonify({
                    "status": "success", 
                    "donor_contacted": donor['name'], 
                    "contact_number": donor['contact_number'],
                    "rank_used": index + 1
                }), 200
            
            else:
                print(f"FAILOVER: CPaaS error {response.status_code} for {donor['name']}. Moving to next donor.")

        except Exception as e:
            print(f"CRITICAL ERROR during CPaaS request: {e}. Moving to next donor.")
            continue # Move to the next donor in the loop
            
    # 4. Final Failover (If all 5 failed)
    return jsonify({"status": "failed", "reason": "All top 5 donors failed to queue SMS."}), 200




@app.route('/api/blood/confirm-donation', methods=['POST'])
def confirm_donation_endpoint():
    """
    Receives confirmation of a successful donation (e.g., from a CPaaS webhook)
    and autonomously triggers the permanent CSV update.
    """
    try:
        data = request.json
        donor_id = data.get('donor_id')
        pints = data.get('pints_donated', 1) # Default to 1 pint
        
        if not donor_id:
            return jsonify({"error": "Missing 'donor_id'."}), 400

        # Replace this function call with the actual imported function once integrated.
        # For this example, we'll assume the update logic is available:
        success = update_donor_record(donor_id, pints_donated=pints)

        if success:
            return jsonify({
                "status": "completed", 
                "message": f"Record updated for donor {donor_id}. Cooldown activated."
            }), 200
        else:
            return jsonify({
                "status": "failed", 
                "message": f"Donor {donor_id} not found or file update failed."
            }), 404
            
    except Exception as e:
        return jsonify({"error": f"Internal server error during confirmation: {e}"}), 500


# --- Running the App ---
if __name__ == '__main__':
    # Load resources once before starting the application
    try:
        load_resources()
    except Exception:
        # If resources fail to load, the app cannot start
        print("Application failed to start due to resource loading error.")
        exit(1)
        
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)