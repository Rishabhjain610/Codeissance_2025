import pandas as pd
from datetime import datetime

# --- 1. Define Donation Parameters ---
# Use the donor's unique ID to target the correct record
DONOR_ID_TO_UPDATE = 'a6a3f7fe55'  # Example donor ID
PINTS_DONATED = 1
TODAY = datetime(2025, 9, 26).strftime('%Y-%m-%d') # Format as YYYY-MM-DD

# --- 2. Load the Master Dataset ---
FILE_NAME = 'final_indian_blood_donor_dataset.csv'
df = pd.read_csv(FILE_NAME)

# --- 3. Update Donor Record ---
# Find the index of the donor to be updated
donor_index = df[df['donor_id'] == DONOR_ID_TO_UPDATE].index

if not donor_index.empty:
    idx = donor_index[0]
    
    # a. Check and Add 'last_donation_date' column if it doesn't exist
    if 'last_donation_date' not in df.columns:
        # Initializing new column using 'created_at' as a starting point
        df['last_donation_date'] = df['created_at']
        print(f"Added 'last_donation_date' column and initialized with 'created_at'.")

    # b. Apply the updates
    df.loc[idx, 'number_of_donation'] += 1
    df.loc[idx, 'pints_donated'] += PINTS_DONATED
    df.loc[idx, 'last_donation_date'] = TODAY
    
    print(f"\nSuccessfully updated donor ID {DONOR_ID_TO_UPDATE}:")
    print(f"  New Donation Count: {df.loc[idx, 'number_of_donation']}")
    print(f"  New Last Donation Date: {df.loc[idx, 'last_donation_date']}")
    
    # --- 4. Save Changes Permanently ---
    df.to_csv(FILE_NAME, index=False)
    print(f"\nCSV file '{FILE_NAME}' successfully updated on disk.")
    
else:
    print(f"Error: Donor ID {DONOR_ID_TO_UPDATE} not found.")