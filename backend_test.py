#!/usr/bin/env python3
"""
EdgeLog API Backend Testing
Tests all endpoints for the trading journal app
"""
import requests
import sys
from datetime import datetime, timezone
import json

# Test configuration
BASE_URL = "https://create-anything-39.preview.emergentagent.com/api"
SESSION_TOKEN = "test_session_1771145804897"  # From MongoDB setup
USER_ID = "test-user-1771145804897"  # From MongoDB setup

class EdgeLogAPITester:
    def __init__(self, base_url=BASE_URL, session_token=SESSION_TOKEN):
        self.base_url = base_url
        self.session_token = session_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.trade_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            # Include session token in cookies as well as header
            request_cookies = {'session_token': self.session_token}
            if cookies:
                request_cookies.update(cookies)
            
            if method == 'GET':
                response = requests.get(url, headers=self.headers, cookies=request_cookies)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=self.headers, cookies=request_cookies)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=self.headers, cookies=request_cookies)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers, cookies=request_cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                if response.text:
                    try:
                        resp_data = response.json()
                        print(f"Response: {json.dumps(resp_data, indent=2)[:200]}...")
                        return success, resp_data
                    except:
                        print(f"Response: {response.text[:200]}...")
                        return success, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return success, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("\n" + "="*50)
        print("🏥 TESTING HEALTH CHECK ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        self.run_test("Root API Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("🔐 TESTING AUTH ENDPOINTS")
        print("="*50)
        
        # Test /auth/me endpoint
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"User authenticated: {user_data.get('name', 'Unknown')}")
        
        return success

    def test_trade_endpoints(self):
        """Test trade CRUD endpoints"""
        print("\n" + "="*50)
        print("📊 TESTING TRADE ENDPOINTS")
        print("="*50)
        
        # Create a new trade
        trade_data = {
            "trading_pair": "XAUUSD",
            "trade_type": "buy",
            "entry_price": 2650.50,
            "stop_loss": 2640.00,
            "take_profit": 2670.00,
            "lot_size": 0.01,
            "trade_date": datetime.now(timezone.utc).isoformat(),
            "notes": "Test trade from API testing",
            "emotion_before": "confident"
        }
        
        success, response = self.run_test(
            "Create Trade",
            "POST",
            "trades",
            200,  # Backend returns 200, not 201
            data=trade_data
        )
        
        if success and 'trade_id' in response:
            self.trade_id = response['trade_id']
            print(f"Created trade ID: {self.trade_id}")
        
        # Get all trades
        self.run_test("Get All Trades", "GET", "trades", 200)
        
        # Get today's trades
        self.run_test("Get Today's Trades", "GET", "trades/today", 200)
        
        # Update trade if we have an ID
        if self.trade_id:
            update_data = {
                "close_price": 2665.00,
                "outcome": "win",
                "pnl": 145.50
            }
            self.run_test(
                "Update Trade",
                "PUT",
                f"trades/{self.trade_id}",
                200,
                data=update_data
            )
        
        # Delete trade if we have an ID
        if self.trade_id:
            self.run_test(
                "Delete Trade",
                "DELETE",
                f"trades/{self.trade_id}",
                200
            )

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n" + "="*50)
        print("📈 TESTING ANALYTICS ENDPOINTS")
        print("="*50)
        
        # Get analytics summary
        self.run_test("Get Analytics Summary", "GET", "analytics/summary", 200)
        
        # Get daily analytics
        self.run_test("Get Daily Analytics", "GET", "analytics/daily", 200)

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n" + "="*50)
        print("⚙️ TESTING SETTINGS ENDPOINTS")
        print("="*50)
        
        # Update discipline settings
        discipline_data = {"max_trades_per_day": 10}
        self.run_test(
            "Update Discipline Settings",
            "PUT",
            "settings/discipline",
            200,
            data=discipline_data
        )
        
        # Get reminder settings
        self.run_test("Get Reminder Settings", "GET", "settings/reminders", 200)
        
        # Update reminder settings
        reminder_data = {
            "daily_reminder_enabled": True,
            "reminder_time": "09:00"
        }
        self.run_test(
            "Update Reminder Settings",
            "PUT",
            "settings/reminders",
            200,
            data=reminder_data
        )

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting EdgeLog API Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Session Token: {self.session_token[:20]}...")
        
        # Test in logical order
        self.test_health_endpoints()
        
        if not self.test_auth_endpoints():
            print("❌ Authentication failed, skipping protected endpoints")
            return self.get_results()
        
        self.test_trade_endpoints()
        self.test_analytics_endpoints()
        self.test_settings_endpoints()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print(f"\n" + "="*50)
        print("📊 TEST RESULTS SUMMARY")
        print("="*50)
        print(f"Tests passed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test execution"""
    tester = EdgeLogAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())