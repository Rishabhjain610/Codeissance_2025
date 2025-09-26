import requests
import time
from datetime import datetime

# --- Configuration ---
API_URL = "http://127.0.0.1:5000/api/blood/initiate-call"
INVENTORY_DB_MOCK = {
    'O-': {'current_units': 10, 'threshold': 15},
    'A+': {'current_units': 25, 'threshold': 20},
    # Add other blood types here...
}
HOSPITAL_LOCATION = {'lat': 19.0760, 'lon': 72.8777} # Mumbai

def check_inventory_and_act():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking inventory...")
    
    shortages_found = []
    
    # 1. Simulate Checking Inventory Database
    for blood_group, inventory in INVENTORY_DB_MOCK.items():
        if inventory['current_units'] < inventory['threshold']:
            print(f"--- SHORTAGE DETECTED: {blood_group} ---")
            shortages_found.append(blood_group)

    # 2. Autonomous Outreach (Calling the API)
    for group in shortages_found:
        print(f"Initiating autonomous call outreach for {group}...")
        
        payload = {
            "blood_group": group,
            "lat": HOSPITAL_LOCATION['lat'],
            "lon": HOSPITAL_LOCATION['lon']
        }
        
        try:
            # POST request to your API to start the call loop
            response = requests.post(API_URL, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print(f"  API Response Status: {result.get('status')}")
                if result.get('status') == 'success':
                    print(f"  SUCCESS: Contacted and confirmed donor {result.get('donor_contacted')}.")
                    # In a real system, you would update the inventory here.
                elif result.get('reason'):
                     print(f"  FAILURE: {result.get('reason')}")
            else:
                print(f"  ERROR: API returned status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"  ERROR: Could not connect to API at {API_URL}. Is Flask running?")
        except Exception as e:
            print(f"  An unexpected error occurred: {e}")

if __name__ == "__main__":
    # In a real setup, you would use a scheduler here.
    # For a simple test, just run it once.
    check_inventory_and_act()