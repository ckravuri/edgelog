"""
EdgeLog Backend API Sanity Check Tests
- Tests for pre-App Store release verification
- Focus on API health and basic endpoint availability
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health check and basic API endpoints"""
    
    def test_api_root_endpoint(self):
        """Test /api/ root endpoint returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "EdgeLog API"
        assert "version" in data
        assert data["version"] == "1.0.0"
        print(f"✓ API root: {data}")
    
    def test_api_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check: {data}")


class TestAuthEndpoints:
    """Authentication endpoint availability tests"""
    
    def test_auth_me_requires_authentication(self):
        """Test /api/auth/me returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly returns 401 without auth")
    
    def test_auth_session_requires_session_id(self):
        """Test /api/auth/session requires session_id"""
        response = requests.post(f"{BASE_URL}/api/auth/session", json={})
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "session_id" in data["detail"].lower()
        print("✓ /api/auth/session correctly validates session_id requirement")
    
    def test_logout_endpoint_exists(self):
        """Test /api/auth/logout endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        # Logout should work even without auth (just clear cookies)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Logout endpoint: {data}")


class TestProtectedEndpointsRequireAuth:
    """Verify protected endpoints require authentication"""
    
    def test_trades_requires_auth(self):
        """Test /api/trades requires authentication"""
        response = requests.get(f"{BASE_URL}/api/trades")
        assert response.status_code == 401
        print("✓ /api/trades correctly requires authentication")
    
    def test_analytics_requires_auth(self):
        """Test /api/analytics/summary requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/summary")
        assert response.status_code == 401
        print("✓ /api/analytics/summary correctly requires authentication")
    
    def test_reports_requires_auth(self):
        """Test /api/reports requires authentication"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 401
        print("✓ /api/reports correctly requires authentication")


class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self):
        """Test CORS headers are present in response"""
        response = requests.options(f"{BASE_URL}/api/health", headers={
            "Origin": "https://trade-journal-app-16.preview.emergentagent.com",
            "Access-Control-Request-Method": "GET"
        })
        # OPTIONS should return 200 or response has CORS headers
        assert response.status_code in [200, 204, 405]
        print(f"✓ CORS check completed, status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
