// Helper function for authenticated API calls
// Uses localStorage token for native iOS apps, falls back to cookies for web

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem('session_token');
  
  const headers = {
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });
  
  return response;
}

export async function authFetchJson(endpoint, options = {}) {
  const response = await authFetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response;
}

export { API };
