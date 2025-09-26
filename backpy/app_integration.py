# === INTEGRATION INSTRUCTIONS FOR YOUR EXISTING app.py ===

# 1. ADD THESE IMPORTS TO YOUR app.py (at the top after existing imports):
import google.generativeai as genai
from threading import Thread
import concurrent.futures

# 2. ADD THESE CONFIGURATION VARIABLES (after existing config):
GENAI_API_KEY = "YOUR_GOOGLE_AI_API_KEY"  # Get this from Google AI Studio
genai.configure(api_key=GENAI_API_KEY)

# 3. ADD THIS ENHANCED ENDPOINT TO REPLACE YOUR EXISTING /api/blood/initiate-call:

@app.route('/api/blood/initiate-call-enhanced', methods=['POST'])
def initiate_call_outreach_enhanced():
    """
    Enhanced version that includes AI analysis for urgency and decision making.
    """
    try:
        data = request.json
        blood_group = data['blood_group']
        lat = data['lat']
        lon = data['lon']
        urgency_level = data.get('urgency_level', 5)  # Scale 1-10
        ai_reasoning = data.get('ai_reasoning', '')
        
    except Exception as e:
        return jsonify({"error": f"Invalid or incomplete JSON input: {e}"}), 400

    # Generate enhanced message based on urgency
    if urgency_level >= 8:
        message_template = (
            "🚨 CRITICAL BLOOD EMERGENCY 🚨 Your {blood_group} blood is URGENTLY needed "
            "at a nearby hospital. IMMEDIATE response required. Reply YES to save a life or NO to decline. "
            "Reply STOP to opt out. [Donor ID: {donor_id}] [Emergency Level: CRITICAL]"
        )
    elif urgency_level >= 6:
        message_template = (
            "URGENT BLOOD DONOR NEEDED. Your blood group ({blood_group}) is urgently "
            "required at a hospital near your location. Reply YES to accept or NO to decline. "
            "Reply STOP to opt out. [Donor ID: {donor_id}] [Emergency Level: HIGH]"
        )
    else:
        message_template = SMS_MESSAGE_TEMPLATE  # Use your existing template

    # Use existing donor finding logic
    today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    top_donors_df = find_top_blood_donors(blood_group, lat, lon, today, top_n=5)
    
    if top_donors_df.empty:
        return jsonify({"status": "failed", "reason": "No eligible donors found."}), 200

    # Enhanced failover with AI-driven prioritization
    contacted_donors = []
    
    for index, donor in top_donors_df.iterrows():
        message_body = message_template.format(
            blood_group=blood_group,
            donor_id=donor['donor_id']
        )

        try:
            response = requests.post(
                CPASS_URL,
                auth=(AUTH_SID, AUTH_TOKEN),
                data={
                    'From': '+18623552189',
                    'To': donor['contact_number'],
                    'Body': message_body
                }
            )
            
            contacted_donors.append({
                'donor_id': donor['donor_id'],
                'name': donor['name'],
                'contact_number': donor['contact_number'],
                'status': 'success' if response.status_code == 201 else 'failed',
                'suitability_score': float(donor['suitability_score'])
            })
            
            if response.status_code == 201:
                print(f"SUCCESS: Enhanced SMS sent to {donor['name']} (Urgency: {urgency_level}/10)")
                return jsonify({
                    "status": "success", 
                    "donor_contacted": donor['name'],
                    "contact_number": donor['contact_number'],
                    "urgency_level": urgency_level,
                    "ai_reasoning": ai_reasoning,
                    "rank_used": index + 1,
                    "all_contacted": contacted_donors
                }), 200
            
        except Exception as e:
            contacted_donors.append({
                'donor_id': donor['donor_id'],
                'name': donor['name'],
                'contact_number': donor['contact_number'],
                'status': 'error',
                'error': str(e),
                'suitability_score': float(donor['suitability_score'])
            })
            continue
            
    return jsonify({
        "status": "failed", 
        "reason": "All top 5 donors failed to receive SMS.",
        "all_contacted": contacted_donors
    }), 200


# 4. ADD THESE NEW ENDPOINTS TO YOUR app.py:

@app.route('/api/emergency/sos', methods=['POST'])
def trigger_emergency_sos():
    """
    Emergency SOS endpoint - alerts emergency contacts and triggers autonomous donor search.
    """
    try:
        sos_data = request.json
        
        # Validate essential fields
        required_fields = ['user_id', 'emergency_type', 'user_location', 'emergency_contacts']
        for field in required_fields:
            if field not in sos_data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        if sos_data['emergency_type'] not in ['blood', 'organ']:
            return jsonify({"error": "Emergency type must be 'blood' or 'organ'"}), 400
        
        if len(sos_data['emergency_contacts']) > 5:
            return jsonify({"error": "Maximum 5 emergency contacts allowed"}), 400
        
        # Generate SOS ID
        sos_id = f"sos_{sos_data['user_id']}_{int(datetime.now().timestamp())}"
        
        # Create emergency message
        user_name = sos_data.get('user_name', 'Someone')
        emergency_type = sos_data['emergency_type']
        location = sos_data['user_location']
        
        if emergency_type == 'blood':
            blood_group = sos_data.get('blood_group', 'Unknown')
            emergency_message = (
                f"🚨 MEDICAL EMERGENCY 🚨\n"
                f"{user_name} urgently needs {blood_group} blood donation!\n"
                f"Location: {location.get('address', 'Location shared')}\n"
                f"Contact immediately if you can help or know donors.\n"
                f"This is an automated emergency alert."
            )
        else:  # organ
            organ_type = sos_data.get('organ_type', 'organ')
            emergency_message = (
                f"🚨 CRITICAL MEDICAL EMERGENCY 🚨\n"
                f"{user_name} urgently needs {organ_type} transplant!\n"
                f"Location: {location.get('address', 'Location shared')}\n"
                f"Please contact immediately if you can assist.\n"
                f"This is an automated emergency alert."
            )
        
        # Send SMS to emergency contacts (parallel execution)
        sms_results = []
        contact_numbers = [contact['phone_number'] for contact in sos_data['emergency_contacts']]
        
        def send_emergency_sms(phone_number, message):
            try:
                response = requests.post(
                    CPASS_URL,
                    auth=(AUTH_SID, AUTH_TOKEN),
                    data={
                        'From': '+18623552189',
                        'To': phone_number,
                        'Body': message
                    },
                    timeout=10
                )
                return {
                    'phone_number': phone_number,
                    'success': response.status_code == 201,
                    'message_sid': response.json().get('sid') if response.status_code == 201 else None
                }
            except Exception as e:
                return {
                    'phone_number': phone_number,
                    'success': False,
                    'error': str(e)
                }
        
        # Use ThreadPoolExecutor for concurrent SMS sending
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_phone = {
                executor.submit(send_emergency_sms, phone, emergency_message): phone 
                for phone in contact_numbers
            }
            
            for future in concurrent.futures.as_completed(future_to_phone):
                try:
                    result = future.result(timeout=15)
                    sms_results.append(result)
                except Exception as e:
                    phone = future_to_phone[future]
                    sms_results.append({
                        'phone_number': phone,
                        'success': False,
                        'error': f'SMS failed: {str(e)}'
                    })
        
        # Trigger autonomous donor search
        search_results = {}
        try:
            if emergency_type == 'blood':
                # Use existing blood donor endpoint
                today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
                donors_df = find_top_blood_donors(
                    sos_data.get('blood_group', 'O+'),
                    location['latitude'],
                    location['longitude'],
                    today,
                    top_n=5
                )
                search_results = {
                    'autonomous_search': 'success' if not donors_df.empty else 'no_matches',
                    'donors_found': len(donors_df),
                    'top_donors': donors_df.to_dict('records') if not donors_df.empty else []
                }
            else:  # organ
                # Use existing organ matching logic
                current_time_utc = datetime.utcnow()
                matches_df = find_best_organ_match(
                    sos_data.get('organ_type', 'Kidney'),
                    location['latitude'],
                    location['longitude'],
                    current_time_utc,
                    top_n=5
                )
                search_results = {
                    'autonomous_search': 'success' if not matches_df.empty else 'no_matches',
                    'matches_found': len(matches_df),
                    'top_matches': matches_df.to_dict('records') if not matches_df.empty else []
                }
        except Exception as e:
            search_results = {
                'autonomous_search': 'failed',
                'error': str(e)
            }
        
        # Compile final results
        successful_sms = [r for r in sms_results if r['success']]
        
        sos_response = {
            'sos_id': sos_id,
            'timestamp': datetime.now().isoformat(),
            'emergency_alerts': {
                'total_contacts': len(contact_numbers),
                'successful_alerts': len(successful_sms),
                'failed_alerts': len(sms_results) - len(successful_sms),
                'success_rate': len(successful_sms) / len(contact_numbers) if contact_numbers else 0,
                'detailed_results': sms_results
            },
            'autonomous_donor_search': search_results,
            'overall_status': 'success' if (len(successful_sms) > 0 or search_results.get('autonomous_search') == 'success') else 'failed',
            'emergency_message': emergency_message
        }
        
        return jsonify(sos_response), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Critical error during SOS execution: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route('/api/ai-agent/start-monitoring', methods=['POST'])
def start_ai_monitoring():
    """
    Starts the Google AI agent for continuous blood bank monitoring.
    """
    try:
        config = request.json or {}
        check_interval = config.get('check_interval_minutes', 15)
        
        # Start monitoring in a separate thread
        def run_ai_monitoring():
            model = genai.GenerativeModel('gemini-pro')
            monitoring_active = True
            
            while monitoring_active:
                try:
                    # Simulate inventory check (replace with real API)
                    import random
                    
                    inventory_data = {}
                    thresholds = {'O+': 20, 'O-': 15, 'A+': 25, 'A-': 12, 'B+': 20, 'B-': 10, 'AB+': 15, 'AB-': 8}
                    
                    shortages_detected = []
                    
                    for blood_group, threshold in thresholds.items():
                        current_units = random.randint(5, 35)
                        
                        if current_units < threshold:
                            print(f"🚨 AI AGENT: Shortage detected for {blood_group}")
                            
                            # AI Analysis
                            shortage_severity = (threshold - current_units) / threshold
                            
                            prompt = f"""
                            BLOOD SHORTAGE ANALYSIS:
                            Blood Group: {blood_group}
                            Current: {current_units} units
                            Threshold: {threshold} units
                            Shortage: {shortage_severity:.1%}
                            
                            Determine urgency (1-10) and recommend action. Respond with JSON:
                            {{"urgency_level": X, "recommended_donors": Y, "reasoning": "..."}}
                            """
                            
                            try:
                                ai_response = model.generate_content(prompt)
                                import json
                                ai_analysis = json.loads(ai_response.text)
                            except:
                                ai_analysis = {"urgency_level": 7, "recommended_donors": 5, "reasoning": "Fallback analysis"}
                            
                            # Trigger autonomous outreach
                            payload = {
                                "blood_group": blood_group,
                                "lat": 19.0760,  # Mumbai example
                                "lon": 72.8777,
                                "urgency_level": ai_analysis['urgency_level'],
                                "ai_reasoning": ai_analysis['reasoning']
                            }
                            
                            try:
                                response = requests.post(
                                    "http://127.0.0.1:5000/api/blood/initiate-call-enhanced",
                                    json=payload,
                                    timeout=30
                                )
                                
                                if response.status_code == 200:
                                    result = response.json()
                                    print(f"✅ AI AGENT: Successfully contacted donor for {blood_group}")
                                    shortages_detected.append({
                                        'blood_group': blood_group,
                                        'ai_analysis': ai_analysis,
                                        'outreach_result': result
                                    })
                            except Exception as e:
                                print(f"❌ AI AGENT: Outreach failed for {blood_group}: {e}")
                    
                    if shortages_detected:
                        print(f"📊 AI AGENT: Monitoring cycle complete. {len(shortages_detected)} shortages addressed.")
                    else:
                        print("💚 AI AGENT: All blood levels adequate.")
                    
                    time.sleep(check_interval * 60)
                    
                except Exception as e:
                    print(f"💥 AI AGENT ERROR: {e}")
                    time.sleep(60)  # Wait 1 minute before retry
        
        # Start monitoring thread
        monitoring_thread = Thread(target=run_ai_monitoring, daemon=True)
        monitoring_thread.start()
        
        return jsonify({
            "status": "success",
            "message": f"AI monitoring started with {check_interval} minute intervals",
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to start AI monitoring: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route('/api/emergency/test-sms', methods=['POST'])
def test_emergency_sms():
    """Test SMS functionality."""
    try:
        data = request.json
        phone_number = data.get('phone_number')
        message = data.get('message', 'Test emergency alert from Blood Donation System')
        
        if not phone_number:
            return jsonify({"error": "Phone number required"}), 400
        
        response = requests.post(
            CPASS_URL,
            auth=(AUTH_SID, AUTH_TOKEN),
            data={
                'From': '+18623552189',
                'To': phone_number,
                'Body': message
            }
        )
        
        return jsonify({
            'phone_number': phone_number,
            'success': response.status_code == 201,
            'status_code': response.status_code,
            'message_sid': response.json().get('sid') if response.status_code == 201 else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"SMS test failed: {str(e)}"}), 500


# 5. UPDATE YOUR requirements.txt TO INCLUDE:
"""
Add these lines to your requirements.txt:
google-generativeai
concurrent-futures  # For Python < 3.2 (usually built-in for newer versions)
"""

# === USAGE EXAMPLES ===

# 1. Start AI Monitoring:
"""
POST /api/ai-agent/start-monitoring
{
  "check_interval_minutes": 10
}
"""

# 2. Trigger Emergency SOS:
"""
POST /api/emergency/sos
{
  "user_id": "user123",
  "user_name": "John Doe",
  "emergency_type": "blood",
  "blood_group": "O+",
  "user_location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Mumbai Central Hospital"
  },
  "emergency_contacts": [
    {"name": "Contact 1", "phone_number": "+911234567890"},
    {"name": "Contact 2", "phone_number": "+911234567891"}
  ]
}
"""

# 3. Test SMS:
"""
POST /api/emergency/test-sms
{
  "phone_number": "+911234567890",
  "message": "Test message"
}
"""