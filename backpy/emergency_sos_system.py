import json
import requests
from datetime import datetime
from typing import List, Dict
from flask import Blueprint, request, jsonify
import concurrent.futures
from math import radians, sin, cos, sqrt, asin

# --- SOS Configuration ---
SOS_BLUEPRINT = Blueprint('sos', __name__)
'''
# Twilio Configuration (use your existing credentials)
TWILIO_ACCOUNT_SID = "AC7f54ae9012bfa1296d94fa3b73bc4f3c"
TWILIO_AUTH_TOKEN = "7ea2777041e3341ceeb9978f36fbfc7e"
TWILIO_PHONE_NUMBER = "+18623552189"
CPASS_URL = "https://api.twilio.com/2010-04-01/Accounts/AC7f54ae9012bfa1296d94fa3b73bc4f3c/Messages.json"
'''
# Hospital Directory with emergency contact numbers
HOSPITAL_DATA = [
    {
        "name": "Apollo Hospital, Navi Mumbai",
        "latitude": 19.0330,
        "longitude": 73.0297,
        "emergency_contact_number": "+919123456780" # Use a real number for testing
    },
    {
        "name": "Fortis Hiranandani Hospital, Vashi",
        "latitude": 19.0649,
        "longitude": 73.0031,
        "emergency_contact_number": "+919123456781"
    },
    {
        "name": "MGM New Bombay Hospital, Vashi",
        "latitude": 19.0631,
        "longitude": 72.9969,
        "emergency_contact_number": "+919123456782"
    }
]

class EmergencySOSSystem:
    """
    Emergency SOS system that alerts a user's saved emergency contacts
    and notifies the nearest hospital.
    """
    
    def __init__(self):
        self.active_sos_requests = {}  # Track active SOS requests

    def haversine(self, lat1, lon1, lat2, lon2):
        """Calculates the distance between two lat/lon points in kilometers."""
        R = 6371  # Earth radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
        c = 2 * asin(sqrt(a))
        
        return R * c
        
    def validate_sos_request(self, sos_data: Dict) -> tuple[bool, str]:
        """Validates the incoming SOS request data."""
        required_fields = ['user_id', 'emergency_type', 'user_location', 'emergency_contacts']
        
        for field in required_fields:
            if field not in sos_data:
                return False, f"Missing required field: {field}"
        
        if sos_data['emergency_type'] not in ['blood', 'organ']:
            return False, "Emergency type must be 'blood' or 'organ'"
        
        if not isinstance(sos_data['emergency_contacts'], list) or len(sos_data['emergency_contacts']) == 0:
            return False, "Must provide at least one emergency contact"
        
        if len(sos_data['emergency_contacts']) > 5:
            return False, "Maximum 5 emergency contacts allowed"
        
        return True, "Valid"
    
    def send_emergency_sms(self, phone_number: str, message: str) -> Dict:
        """Sends emergency SMS to a single contact."""
        try:
            response = requests.post(
                CPASS_URL,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                data={
                    'From': TWILIO_PHONE_NUMBER,
                    'To': phone_number,
                    'Body': message
                },
                timeout=10
            )
            
            return {
                'phone_number': phone_number,
                'success': response.status_code == 201,
                'status_code': response.status_code,
                'message_sid': response.json().get('sid') if response.status_code == 201 else None,
                'error': None if response.status_code == 201 else response.text
            }
        except requests.exceptions.RequestException as e:
            return {
                'phone_number': phone_number,
                'success': False,
                'status_code': None,
                'message_sid': None,
                'error': str(e)
            }
    
    def send_emergency_call_alerts(self, phone_numbers: List[str], message: str) -> List[Dict]:
        """Sends emergency alerts to multiple contacts simultaneously using threading."""
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_phone = {executor.submit(self.send_emergency_sms, phone, message): phone for phone in phone_numbers}
            results = [future.result() for future in concurrent.futures.as_completed(future_to_phone)]
        return results

    def alert_nearest_hospital(self, sos_data: Dict) -> Dict:
        """Finds the nearest hospital and sends it an emergency SMS alert."""
        user_lat = sos_data['user_location']['latitude']
        user_lon = sos_data['user_location']['longitude']
        
        if not HOSPITAL_DATA:
            return {"status": "failed", "error": "No hospitals configured in the system."}

        # 1. Find the nearest hospital
        nearest_hospital = None
        min_distance = float('inf')

        for hospital in HOSPITAL_DATA:
            distance = self.haversine(user_lat, user_lon, hospital['latitude'], hospital['longitude'])
            if distance < min_distance:
                min_distance = distance
                nearest_hospital = hospital
        
        # 2. Create a professional alert message for the hospital
        user_name = sos_data.get('user_name', 'An individual')
        emergency_type = sos_data['emergency_type']
        details = ""
        if emergency_type == 'blood':
            details = f"Requires Blood Type: {sos_data.get('blood_group', 'Unknown')}"
        else: # organ
            details = f"Requires Organ: {sos_data.get('organ_type', 'Unknown')}"

        hospital_message = (
            f"URGENT SOS ALERT: Potential Incoming Patient.\n"
            f"Patient Name: {user_name}\n"
            f"Emergency: {details}\n"
            f"Location: Near {sos_data['user_location'].get('address', 'user location')}\n"
            f"This is an automated alert from the emergency response system."
        )

        # 3. Send the alert using the existing SMS function
        alert_result = self.send_emergency_sms(
            nearest_hospital['emergency_contact_number'],
            hospital_message
        )

        return {
            "status": "success" if alert_result['success'] else "failed",
            "hospital_name": nearest_hospital['name'],
            "distance_km": round(min_distance, 2),
            "alert_details": alert_result
        }
    
    def create_emergency_message_for_contacts(self, sos_data: Dict) -> str:
        """Creates personalized emergency message for contacts."""
        user_name = sos_data.get('user_name', 'Someone')
        emergency_type = sos_data['emergency_type']
        
        message_intro = f"🚨 MEDICAL EMERGENCY 🚨\n{user_name} has an urgent medical situation"
        
        if emergency_type == 'blood':
            blood_group = sos_data.get('blood_group', 'Unknown')
            message = f"{message_intro} and requires {blood_group} blood!\n"
        else: # organ
            organ_type = sos_data.get('organ_type', 'an organ')
            message = f"{message_intro} and requires an {organ_type} transplant!\n"
            
        message += "This is an automated emergency alert. Please contact them immediately."
        return message
    
    def execute_sos_request(self, sos_data: Dict) -> Dict:
        """Main SOS execution function - coordinates all emergency response actions."""
        sos_id = f"sos_{sos_data['user_id']}_{int(datetime.now().timestamp())}"
        
        print(f"🚨 EXECUTING SOS REQUEST {sos_id}")
        
        self.active_sos_requests[sos_id] = {
            'start_time': datetime.now(),
            'status': 'processing',
            'data': sos_data
        }
        
        # Create emergency message for personal contacts
        contact_message = self.create_emergency_message_for_contacts(sos_data)
        
        # Step 1: Send alerts to emergency contacts (parallel)
        contact_numbers = [contact['phone_number'] for contact in sos_data['emergency_contacts']]
        sms_results = self.send_emergency_call_alerts(contact_numbers, contact_message)
        
        # Step 2: Alert the nearest hospital (parallel)
        hospital_alert_results = self.alert_nearest_hospital(sos_data)
        
        # Compile results
        successful_sms = [r for r in sms_results if r['success']]
        
        sos_response = {
            'sos_id': sos_id,
            'timestamp': datetime.now().isoformat(),
            'emergency_alerts_to_contacts': {
                'total_contacts': len(contact_numbers),
                'successful_alerts': len(successful_sms),
                'detailed_results': sms_results
            },
            'hospital_alert': hospital_alert_results,
            'overall_status': 'success' if (len(successful_sms) > 0 or hospital_alert_results.get('status') == 'success') else 'failed',
            'message_sent_to_contacts': contact_message
        }
        
        self.active_sos_requests[sos_id]['status'] = sos_response['overall_status']
        self.active_sos_requests[sos_id]['results'] = sos_response
        
        return sos_response

# Global SOS system instance
sos_system = EmergencySOSSystem()

# --- Flask API Endpoints ---

@SOS_BLUEPRINT.route('/api/emergency/sos', methods=['POST'])
def trigger_emergency_sos():
    """Main SOS endpoint - triggers alerts to contacts and the nearest hospital."""
    try:
        sos_data = request.json
        is_valid, error_msg = sos_system.validate_sos_request(sos_data)
        if not is_valid:
            return jsonify({"error": f"Invalid SOS request: {error_msg}"}), 400
        
        results = sos_system.execute_sos_request(sos_data)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": f"Critical error during SOS execution: {str(e)}"}), 500

@SOS_BLUEPRINT.route('/api/emergency/sos-status/<sos_id>', methods=['GET'])
def get_sos_status(sos_id):
    """Check the status of an active SOS request."""
    request_info = sos_system.active_sos_requests.get(sos_id)
    if not request_info:
        return jsonify({"error": "SOS request not found"}), 404
    
    return jsonify({
        'sos_id': sos_id,
        'status': request_info['status'],
        'start_time': request_info['start_time'].isoformat(),
        'results': request_info.get('results', 'Processing...'),
        'elapsed_time_seconds': (datetime.now() - request_info['start_time']).total_seconds()
    }), 200