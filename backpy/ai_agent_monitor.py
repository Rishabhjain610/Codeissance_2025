import os
import json
import time
import re
import requests
from datetime import datetime, timedelta
import google.generativeai as genai
from typing import Dict, List
import schedule

# --- Configuration ---
GENAI_API_KEY = ""   # Replace with your actual API key
FLASK_API_BASE = "http://127.0.0.1:5000/api"

# Blood bank inventory thresholds (units)
BLOOD_BANK_THRESHOLDS = {
    'O+': 20, 'O-': 15, 'A+': 25, 'A-': 12, 
    'B+': 20, 'B-': 10, 'AB+': 15, 'AB-': 8
}

# Hospital locations (example - replace with real data)
HOSPITAL_LOCATIONS = {
    'mumbai_central': {'lat': 19.0760, 'lon': 72.8777, 'name': 'Mumbai Central Hospital'},
    'delhi_aiims': {'lat': 28.5672, 'lon': 77.2100, 'name': 'AIIMS Delhi'},
    'bangalore_nimhans': {'lat': 12.9432, 'lon': 77.5969, 'name': 'NIMHANS Bangalore'}
}


class GoogleAIBloodBankAgent:
    """Autonomous AI agent that monitors blood bank inventory and initiates 
    donor outreach using Gemini AI for decision making.
    """

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.monitoring_active = False
        self.last_check = {}

    def simulate_blood_inventory_check(self) -> Dict[str, Dict]:
        import random
        inventory_data = {}
        for blood_group, threshold in BLOOD_BANK_THRESHOLDS.items():
            current_units = random.randint(5, 35)
            inventory_data[blood_group] = {
                'current_units': current_units,
                'threshold': threshold,
                'status': 'critical' if current_units < threshold else 'adequate',
                'shortage_severity': max(0, (threshold - current_units) / threshold) if current_units < threshold else 0
            }
        return inventory_data

    def analyze_shortage_with_ai(self, inventory_data: Dict, blood_group: str) -> Dict:
        shortage_info = inventory_data[blood_group]
        prompt = f"""
        BLOOD BANK EMERGENCY ANALYSIS:

        Blood Group: {blood_group}
        Current Units: {shortage_info['current_units']}
        Minimum Threshold: {shortage_info['threshold']}
        Shortage Severity: {shortage_info['shortage_severity']:.2%}

        TASK: Provide JSON with:
        urgency_level (1-10),
        donors_to_contact,
        priority_locations (list of keys from HOSPITAL_LOCATIONS),
        time_critical_hours,
        communication_tone,
        reasoning
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # Extract JSON safely
            match = re.search(r"\{.*\}", text, re.S)
            if match:
                ai_analysis = json.loads(match.group())
                return ai_analysis
            else:
                raise ValueError("No JSON found in AI response")

        except Exception as e:
            print(f"⚠️ AI Analysis failed: {e}")
            return {
                "urgency_level": 8 if shortage_info['shortage_severity'] > 0.5 else 6,
                "donors_to_contact": 5,
                "priority_locations": ["mumbai_central"],
                "time_critical_hours": 6,
                "communication_tone": "urgent",
                "reasoning": "Fallback analysis due to AI error"
            }

    def initiate_intelligent_outreach(self, blood_group: str, ai_analysis: Dict) -> List[Dict]:
        outreach_results = []
        locations_to_try = ai_analysis.get('priority_locations', ['mumbai_central'])

        for location_key in locations_to_try:
            if location_key not in HOSPITAL_LOCATIONS:
                continue

            hospital = HOSPITAL_LOCATIONS[location_key]
            print(f"🏥 Initiating outreach for {hospital['name']} - {blood_group}")

            payload = {
                "blood_group": blood_group,
                "lat": hospital['lat'],
                "lon": hospital['lon'],
                "urgency_level": ai_analysis.get('urgency_level', 5),
                "ai_reasoning": ai_analysis.get('reasoning', '')
            }

            try:
                response = requests.post(f"{FLASK_API_BASE}/blood/initiate-call", 
                                         json=payload, timeout=10)

                if response.status_code == 200:
                    result = response.json()
                    outreach_results.append({
                        'hospital': hospital['name'],
                        'status': result.get('status'),
                        'donor_contacted': result.get('donor_contacted'),
                        'timestamp': datetime.now().isoformat()
                    })
                    if result.get('status') == 'success':
                        print(f"✅ Success at {hospital['name']}: {result.get('donor_contacted')}")
                        break
            except requests.exceptions.RequestException as e:
                print(f"❌ API call failed for {hospital['name']}: {e}")
                outreach_results.append({
                    'hospital': hospital['name'],
                    'status': 'failed',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })

        return outreach_results

    def generate_ai_summary_report(self, monitoring_cycle_results: List[Dict]) -> str:
        results_summary = json.dumps(monitoring_cycle_results, indent=2)
        prompt = f"""
        BLOOD BANK MONITORING CYCLE SUMMARY:

        Results:
        {results_summary}

        TASK: Generate a concise executive summary (<=200 words).
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Summary generation failed: {e}. Manual review of {len(monitoring_cycle_results)} events required."

    def run_monitoring_cycle(self) -> Dict:
        cycle_start = datetime.now()
        print(f"\n🔍 Starting AI monitoring cycle at {cycle_start.strftime('%Y-%m-%d %H:%M:%S')}")

        inventory_data = self.simulate_blood_inventory_check()
        shortages_detected, outreach_results = [], []

        for blood_group, data in inventory_data.items():
            if data['status'] == 'critical':
                last_check_key = f"{blood_group}_last_outreach"
                if (self.last_check.get(last_check_key) and 
                    datetime.now() - self.last_check[last_check_key] < timedelta(minutes=30)):
                    print(f"⏳ Skipping {blood_group} - recent outreach within 30 minutes")
                    continue

                print(f"🚨 CRITICAL SHORTAGE: {blood_group} - {data['current_units']}/{data['threshold']} units")

                ai_analysis = self.analyze_shortage_with_ai(inventory_data, blood_group)
                print(f"🤖 AI Analysis: Urgency {ai_analysis['urgency_level']}/10, "
                      f"Contact {ai_analysis['donors_to_contact']} donors")

                results = self.initiate_intelligent_outreach(blood_group, ai_analysis)
                shortages_detected.append({
                    'blood_group': blood_group,
                    'shortage_data': data,
                    'ai_analysis': ai_analysis,
                    'outreach_results': results
                })
                outreach_results.extend(results)
                self.last_check[last_check_key] = datetime.now()

        summary_report = self.generate_ai_summary_report(shortages_detected)

        cycle_results = {
            'cycle_timestamp': cycle_start.isoformat(),
            'shortages_detected': len(shortages_detected),
            'total_outreach_attempts': len(outreach_results),
            'successful_contacts': len([r for r in outreach_results if r.get('status') == 'success']),
            'ai_summary': summary_report,
            'detailed_results': shortages_detected
        }

        print(f"📊 Cycle Complete: {cycle_results['shortages_detected']} shortages, "
              f"{cycle_results['successful_contacts']} successful contacts")
        print(f"🤖 AI Summary:\n{summary_report}")

        return cycle_results

    def start_continuous_monitoring(self, check_interval_minutes: int = 15):
        self.monitoring_active = True
        print(f"🚀 Continuous AI monitoring every {check_interval_minutes} minutes")
        try:
            while self.monitoring_active:
                self.run_monitoring_cycle()
                print(f"⏰ Next check in {check_interval_minutes} minutes...")
                time.sleep(check_interval_minutes * 60)
        except KeyboardInterrupt:
            print("\n⛔ Monitoring stopped by user")
            self.monitoring_active = False
        except Exception as e:
            print(f"💥 Critical error in monitoring loop: {e}")
            self.monitoring_active = False

    def stop_monitoring(self):
        self.monitoring_active = False
        print("🛑 Monitoring stopped")

def job():
    """Defines the single task the agent needs to perform."""
    # We create a new agent instance for each run to keep it clean.
    agent = GoogleAIBloodBankAgent(api_key=GENAI_API_KEY)
    print("--- Running scheduled monitoring cycle ---")
    agent.run_monitoring_cycle()
    print("--- Cycle complete. Waiting for next scheduled run. ---")

# --- Run Once for Testing ---
if __name__ == "__main__":
    print("🚀 AI Agent Scheduler Started. First run is immediate.")
    
    # Run the job once right away
    job() 
    
    # Schedule the job to run every 15 minutes and store it in a variable
    scheduled_job = schedule.every(4).minutes.do(job)

    # CORRECTED LINE: Get the next_run time from the job variable itself
    print(f"✅ Job scheduled successfully. Next run at: {scheduled_job.next_run.strftime('%H:%M:%S')}")

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n⛔ Scheduler stopped by user.")