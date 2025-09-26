import pandas as pd
import numpy as np
import joblib

# haversine distance fn
def haversine(lat1, lon1, lat2, lon2):
    
    #earth radius in kilometers
    
    R = 6371  

    
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    
    # formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = np.sin(dlat/2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2.0)**2
    c = 2 * np.arcsin(np.sqrt(a))
    
    return R * c


def find_top_donors(required_blood_group, hospital_lat, hospital_long, top_n=5):
    """
    Finds the top 'top_n' most suitable donors based on 
    predicted availability likelihood and proximity to the hospital.
    """
    # Load Data, Model, and Features
    try:
        df = pd.read_csv('final_indian_blood_donor_dataset.csv')
        model = joblib.load('indian_donor_likelihood_model_v3.joblib')
        feature_names = joblib.load('indian_model_features_v3.joblib')
    except FileNotFoundError as e:
        print(f"Error: Required file not found. Ensure all CSV and joblib files are in the directory. ({e})")
        return pd.DataFrame()

    # --- Step A: Filter by Blood Group ---
    df_filtered = df[df['blood_group'] == required_blood_group].copy()
    if df_filtered.empty:
        print(f"No donors found for blood group: {required_blood_group}")
        return pd.DataFrame()

    # --- Step B: Calculate Likelihood (P_available) ---
    
    # 1. Prepare Feature Matrix (X)
    # Ensure all columns match the training data
    X = pd.DataFrame(0, index=df_filtered.index, columns=feature_names)
    
    # Fill numerical and coordinate features
    for col in ['months_since_first_donation', 'number_of_donation', 'pints_donated', 'latitude', 'longitude']:
        if col in X.columns:
            X[col] = df_filtered[col]
            
    # Fill one-hot encoded features
    for index, row in df_filtered.iterrows():
        city_col = f"city_{row['city']}"
        blood_col = f"blood_group_{row['blood_group']}"
        
        if city_col in X.columns:
            X.loc[index, city_col] = 1
        # The blood group column is automatically handled by the filter/loop, but included for completeness
        if blood_col in X.columns:
            X.loc[index, blood_col] = 1

    # 2. Predict Availability Probability (Likelihood)
    # Get the probability of being 'Available' (class 1)
    df_filtered['likelihood'] = model.predict_proba(X)[:, 1]

    # --- Step C: Calculate Distance (D_km) ---
    df_filtered['distance_km'] = haversine(
        df_filtered['latitude'], 
        df_filtered['longitude'], 
        hospital_lat, 
        hospital_long
    )
    
    # --- Step D: Calculate Suitability Score and Rank ---
    # Score = Likelihood / (Distance + 1)
    df_filtered['suitability_score'] = df_filtered['likelihood'] / (df_filtered['distance_km'] + 1)
    
    # Sort and select top N
    df_ranked = df_filtered.sort_values(by='suitability_score', ascending=False)
    
    # --- Step E: Return Final List ---
    result_columns = ['name', 'latitude', 'longitude', 'contact_number', 'distance_km', 'likelihood', 'suitability_score']
    
    return df_ranked[result_columns].head(top_n)

# --- 3. Example Usage ---
# Hospital in Mumbai (approx center coordinates)
HOSPITAL_LAT = 19.0760
HOSPITAL_LONG = 72.8777
BLOOD_TYPE = 'O-'

top_donors = find_top_donors(BLOOD_TYPE, HOSPITAL_LAT, HOSPITAL_LONG, top_n=5)

print("\n-----------------------------------------------------")
print(f"Top 5 Donors for Blood Group: {BLOOD_TYPE} near Hospital ({HOSPITAL_LAT:.4f}, {HOSPITAL_LONG:.4f})")
print("-----------------------------------------------------\n")
print(top_donors.to_markdown(index=False, floatfmt='.4f'))