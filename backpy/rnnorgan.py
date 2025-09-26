import pandas as pd
import numpy as np
from datetime import datetime
from math import radians, sin, cos, sqrt, asin

# --- 1. Haversine Distance Function ---
def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points 
    on the surface of a sphere (Earth). Output in kilometers.
    """
    R = 6371  # Earth radius in kilometers

    # Convert degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

# --- 2. Main Ranking Function ---
def find_best_organ_match(required_organ, recipient_lat, recipient_long, current_time_utc, top_n=5):
    """
    Ranks deceased organ donors based on HLA score, proximity, and organ viability.
    """
    # Viability/Ischemia Time Limits (in hours, based on standard medical guidelines)
    MAX_VIABILITY_HOURS = {'Kidney': 12, 'Heart': 4, 'Liver': 10, 'Lung': 6}.get(required_organ, 12)
    
    # Load Data
    try:
        df = pd.read_csv('indian_organ_donor_dataset.csv')
    except FileNotFoundError:
        print("Error: 'indian_organ_donor_dataset.csv' not found. Please ensure it is in the same directory.")
        return pd.DataFrame()
    
    # --- Step A: Filter & Time-Based Eligibility ---
    
    # Filter for the required organ and deceased donors
    df_eligible = df[
        (df['organ_available'] == required_organ) & 
        (df['donor_type'] == 'Deceased')
    ].copy()
    
    if df_eligible.empty:
        print(f"No eligible deceased donors found for organ: {required_organ}")
        return pd.DataFrame()
        
    df_eligible['time_available_utc'] = pd.to_datetime(df_eligible['time_available_utc'])
    
    # Calculate Cold Ischemia Time (Time elapsed since organ was available)
    time_elapsed = current_time_utc - df_eligible['time_available_utc']
    df_eligible['hours_elapsed'] = time_elapsed.dt.total_seconds() / 3600
    
    # Filter out organs that are past the viability window
    df_eligible = df_eligible[df_eligible['hours_elapsed'] < MAX_VIABILITY_HOURS].copy()
    
    if df_eligible.empty:
        print(f"All organs for {required_organ} are past the viability time limit of {MAX_VIABILITY_HOURS} hours.")
        return pd.DataFrame()

    # --- Step B: Calculate Distance & Penalties ---
    
    # Distance (km)
    df_eligible['distance_km'] = df_eligible.apply(
        lambda row: haversine(row['latitude'], row['longitude'], recipient_lat, recipient_long), axis=1
    )
    
    # Ischemia Time Penalty: Reducer factor based on remaining viability time
    df_eligible['time_penalty_factor'] = 1 - (df_eligible['hours_elapsed'] / MAX_VIABILITY_HOURS)
    
    # --- Step C: Calculate Suitability Score and Rank ---
    
    # Score = (HLA Match * Size Factor * Time Penalty) / (Distance + 1)
    df_eligible['suitability_score'] = (
        df_eligible['hla_match_score'] * df_eligible['tissue_size_factor'] * df_eligible['time_penalty_factor']
    ) / (df_eligible['distance_km'] + 1)
    
    df_ranked = df_eligible.sort_values(by='suitability_score', ascending=False)
    
    # --- Step D: Return Final List ---
    # NOTE: 'contact_number' corrected to 'hospital_contact_number'
    result_cols = ['name', 'latitude', 'longitude', 'hospital_contact_number', 'hla_match_score', 'hours_elapsed', 'distance_km', 'suitability_score']
    
    return df_ranked[result_cols].head(top_n)

# --- 3. Example Usage (To be called from the frontend) ---

# Front-end Input 1: Recipient Location
RECIPIENT_LAT = 19.0760
RECIPIENT_LONG = 72.8777

# Front-end Input 2: Organ Needed
ORGAN_NEEDED = 'Kidney' 

# Front-end Input 3: Current Time (Crucial for time-sensitive ranking)
# Set this to the current UTC time when the script is run
CURRENT_TIME_OF_MATCH = datetime(2025, 9, 26, 14, 0, 0) # Example: 2:00 PM UTC

top_matches = find_best_organ_match(ORGAN_NEEDED, RECIPIENT_LAT, RECIPIENT_LONG, CURRENT_TIME_OF_MATCH, top_n=5)

if not top_matches.empty:
    print("\n---------------------------------------------------------------------------------------------------")
    print(f"Top 5 Organ Match (Organ: {ORGAN_NEEDED}) near Recipient ({RECIPIENT_LAT}, {RECIPIENT_LONG})")
    print("---------------------------------------------------------------------------------------------------\n")
    # Use to_markdown() for clean output display
    print(top_matches.to_markdown(index=False, floatfmt='.4f'))