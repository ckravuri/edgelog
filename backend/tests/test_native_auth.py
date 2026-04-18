"""
Test suite for EdgeLog Native Auth Endpoints
Tests the new Google-only deep link authentication flow:
- POST /api/auth/native/store - Store token in MongoDB
- POST /api/auth/native/retrieve - Retrieve and delete token (one-time)
- GET /api/auth/native-callback - HTML callback page with dynamic API URL
- GET /.well-known/assetlinks.json - Android App Links config
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")
    
    def test_root_endpoint(self):
        """GET /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "EdgeLog" in data.get("message", "")
        print(f"✓ Root endpoint passed: {data}")


class TestNativeAuthStore:
    """Tests for POST /api/auth/native/store endpoint"""
    
    def test_store_token_success(self):
        """POST /api/auth/native/store stores token and returns success"""
        auth_request_id = f"test_store_{int(time.time())}"
        session_token = f"test_session_{int(time.time())}"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={
                "auth_request_id": auth_request_id,
                "session_token": session_token
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Store token success: {data}")
        
        # Cleanup - retrieve to delete
        requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": auth_request_id}
        )
    
    def test_store_token_missing_fields(self):
        """POST /api/auth/native/store with missing fields returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={"auth_request_id": "test_only"}
        )
        assert response.status_code == 422
        print(f"✓ Missing fields validation: {response.status_code}")
    
    def test_store_token_upsert(self):
        """POST /api/auth/native/store updates existing token (upsert)"""
        auth_request_id = f"test_upsert_{int(time.time())}"
        
        # Store first token
        response1 = requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={
                "auth_request_id": auth_request_id,
                "session_token": "first_token"
            }
        )
        assert response1.status_code == 200
        
        # Store second token with same ID (should update)
        response2 = requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={
                "auth_request_id": auth_request_id,
                "session_token": "second_token"
            }
        )
        assert response2.status_code == 200
        
        # Retrieve should return second token
        response3 = requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": auth_request_id}
        )
        assert response3.status_code == 200
        data = response3.json()
        assert data["session_token"] == "second_token"
        print(f"✓ Upsert works correctly: {data}")


class TestNativeAuthRetrieve:
    """Tests for POST /api/auth/native/retrieve endpoint"""
    
    def test_retrieve_token_success(self):
        """POST /api/auth/native/retrieve returns stored token"""
        auth_request_id = f"test_retrieve_{int(time.time())}"
        session_token = f"session_{int(time.time())}"
        
        # First store a token
        store_response = requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={
                "auth_request_id": auth_request_id,
                "session_token": session_token
            }
        )
        assert store_response.status_code == 200
        
        # Then retrieve it
        retrieve_response = requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": auth_request_id}
        )
        
        assert retrieve_response.status_code == 200
        data = retrieve_response.json()
        assert data["session_token"] == session_token
        print(f"✓ Retrieve token success: {data}")
    
    def test_retrieve_token_one_time_only(self):
        """POST /api/auth/native/retrieve deletes token after retrieval"""
        auth_request_id = f"test_onetime_{int(time.time())}"
        
        # Store token
        requests.post(
            f"{BASE_URL}/api/auth/native/store",
            json={
                "auth_request_id": auth_request_id,
                "session_token": "one_time_token"
            }
        )
        
        # First retrieval should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": auth_request_id}
        )
        assert response1.status_code == 200
        
        # Second retrieval should fail (404)
        response2 = requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": auth_request_id}
        )
        assert response2.status_code == 404
        data = response2.json()
        assert "not found" in data["detail"].lower()
        print(f"✓ One-time retrieval works: second attempt returned 404")
    
    def test_retrieve_nonexistent_token(self):
        """POST /api/auth/native/retrieve returns 404 for non-existent token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/native/retrieve",
            json={"auth_request_id": "nonexistent_request_id_12345"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()
        print(f"✓ Non-existent token returns 404: {data}")


class TestNativeCallback:
    """Tests for GET /api/auth/native-callback endpoint"""
    
    def test_callback_returns_html(self):
        """GET /api/auth/native-callback returns HTML content"""
        response = requests.get(
            f"{BASE_URL}/api/auth/native-callback",
            params={"auth_request_id": "test_callback_123"}
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Callback returns HTML: content-type={response.headers.get('content-type')}")
    
    def test_callback_has_cache_control_headers(self):
        """GET /api/auth/native-callback has no-cache headers"""
        response = requests.get(
            f"{BASE_URL}/api/auth/native-callback",
            params={"auth_request_id": "test_cache_123"}
        )
        
        assert response.status_code == 200
        cache_control = response.headers.get("cache-control", "")
        assert "no-cache" in cache_control or "no-store" in cache_control
        print(f"✓ Cache-Control header present: {cache_control}")
        
        # Check for Pragma header
        pragma = response.headers.get("pragma", "")
        if pragma:
            print(f"✓ Pragma header: {pragma}")
        
        # Check for Expires header
        expires = response.headers.get("expires", "")
        if expires:
            print(f"✓ Expires header: {expires}")
    
    def test_callback_has_dynamic_api_url(self):
        """GET /api/auth/native-callback contains dynamic API URL (not hardcoded)"""
        response = requests.get(
            f"{BASE_URL}/api/auth/native-callback",
            params={"auth_request_id": "test_dynamic_url"}
        )
        
        assert response.status_code == 200
        html_content = response.text
        
        # Check that API_URL is set dynamically from backend
        assert "var API_URL=" in html_content or "API_URL='" in html_content
        # The URL should match our backend URL
        assert BASE_URL in html_content or "edgelog-staging" in html_content
        print(f"✓ Dynamic API URL found in HTML")
    
    def test_callback_has_auth_request_id(self):
        """GET /api/auth/native-callback includes auth_request_id in HTML"""
        test_id = "test_auth_id_xyz789"
        response = requests.get(
            f"{BASE_URL}/api/auth/native-callback",
            params={"auth_request_id": test_id}
        )
        
        assert response.status_code == 200
        html_content = response.text
        
        # Check that auth_request_id is embedded in the HTML
        assert test_id in html_content
        print(f"✓ auth_request_id '{test_id}' found in HTML")
    
    def test_callback_has_edgelog_branding(self):
        """GET /api/auth/native-callback has EdgeLog branding"""
        response = requests.get(
            f"{BASE_URL}/api/auth/native-callback",
            params={"auth_request_id": "test_branding"}
        )
        
        assert response.status_code == 200
        html_content = response.text
        
        assert "EDGELOG" in html_content
        assert "Sign In" in html_content or "Signing" in html_content
        print(f"✓ EdgeLog branding found in callback HTML")


class TestAssetLinks:
    """Tests for GET /.well-known/assetlinks.json endpoint"""
    
    def test_assetlinks_returns_json(self):
        """GET /.well-known/assetlinks.json returns valid JSON"""
        response = requests.get(f"{BASE_URL}/.well-known/assetlinks.json")
        
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ assetlinks.json returns valid JSON array")
    
    def test_assetlinks_has_correct_package(self):
        """GET /.well-known/assetlinks.json has correct Android package name"""
        response = requests.get(f"{BASE_URL}/.well-known/assetlinks.json")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) > 0
        first_entry = data[0]
        
        # Check structure
        assert "relation" in first_entry
        assert "target" in first_entry
        
        target = first_entry["target"]
        assert target["namespace"] == "android_app"
        assert target["package_name"] == "com.ravuri.edgelog"
        print(f"✓ Package name correct: {target['package_name']}")
    
    def test_assetlinks_has_sha256_fingerprint(self):
        """GET /.well-known/assetlinks.json has SHA256 certificate fingerprint"""
        response = requests.get(f"{BASE_URL}/.well-known/assetlinks.json")
        
        assert response.status_code == 200
        data = response.json()
        
        target = data[0]["target"]
        assert "sha256_cert_fingerprints" in target
        fingerprints = target["sha256_cert_fingerprints"]
        assert len(fingerprints) > 0
        
        # Verify fingerprint format (XX:XX:XX... pattern)
        fingerprint = fingerprints[0]
        assert ":" in fingerprint
        parts = fingerprint.split(":")
        assert len(parts) == 32  # SHA256 has 32 bytes
        print(f"✓ SHA256 fingerprint present: {fingerprint[:20]}...")
    
    def test_assetlinks_has_correct_relation(self):
        """GET /.well-known/assetlinks.json has handle_all_urls relation"""
        response = requests.get(f"{BASE_URL}/.well-known/assetlinks.json")
        
        assert response.status_code == 200
        data = response.json()
        
        relation = data[0]["relation"]
        assert "delegate_permission/common.handle_all_urls" in relation
        print(f"✓ Correct relation: {relation}")


class TestAuthEndpoints:
    """Tests for existing auth endpoints to ensure they still work"""
    
    def test_auth_me_requires_auth(self):
        """GET /api/auth/me returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ /api/auth/me requires authentication")
    
    def test_auth_session_requires_session_id(self):
        """POST /api/auth/session requires session_id"""
        response = requests.post(
            f"{BASE_URL}/api/auth/session",
            json={}
        )
        assert response.status_code == 400
        data = response.json()
        assert "session_id" in data.get("detail", "").lower()
        print(f"✓ /api/auth/session validates session_id requirement")
    
    def test_auth_logout_works(self):
        """POST /api/auth/logout works without error"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "logged out" in data.get("message", "").lower()
        print(f"✓ /api/auth/logout works: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
