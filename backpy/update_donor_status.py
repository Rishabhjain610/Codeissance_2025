import pandas as pd
from datetime import datetime

# --- Configuration ---
FILE_NAME = 'final_indian_blood_donor_dataset.csv'

def update_donor_record(donor_id_to_update, pints_donated=1):
    """
    Updates a specific donor's record (history and last donation date)
    after a CONFIRMED successful donation.
    """
    try:
        # Load the Master Dataset
        df = pd.read_csv(FILE_NAME)
    except FileNotFoundError:
        print(f"Error: Dataset file '{FILE_NAME}' not found.")
        return False

    # Define today's date for the update
    TODAY = datetime.now().strftime('%Y-%m-%d')
    
    # Find the index of the donor to be updated
    donor_index = df[df['donor_id'] == donor_id_to_update].index

    if not donor_index.empty:
        idx = donor_index[0]
        
        # 1. Ensure 'last_donation_date' column exists (for robustness)
        if 'last_donation_date' not in df.columns:
            df['last_donation_date'] = df['created_at']
            print(f"Added 'last_donation_date' column and initialized.")

        # 2. Apply the updates
        df.loc[idx, 'number_of_donation'] += 1
        df.loc[idx, 'pints_donated'] += pints_donated
        df.loc[idx, 'last_donation_date'] = TODAY
        
        # --- Save Changes Permanently ---
        df.to_csv(FILE_NAME, index=False)
        print(f"\nSUCCESS: Donor ID {donor_id_to_update} updated in CSV.")
        print(f"  New Donation Count: {df.loc[idx, 'number_of_donation']}, Last Donation Date: {TODAY}")
        return True
    else:
        print(f"Error: Donor ID {donor_id_to_update} not found.")
        return False

if __name__ == '__main__':
    # Example usage for direct testing:
    # NOTE: You must replace 'a6a3f7fe55' with a real donor_id from your CSV
    update_donor_record(donor_id_to_update='a6a3f7fe55', pints_donated=1)