import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL hash
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        // Clear hash safely before navigating
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        navigate('/login', { replace: true });
        return;
      }
      
      const sessionId = sessionIdMatch[1];
      
      try {
        // Exchange session_id for session_token
        const response = await fetch(`${API}/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        
        // Clear the hash from URL safely (only once)
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        
        // Small delay to ensure state is cleared
        setTimeout(() => {
          navigate('/', { replace: true, state: { user: data.user } });
        }, 100);
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.message);
        // Clear hash before redirecting to login
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 100);
      }
    };
    
    processAuth();
  }, [navigate]);

  if (error) {
    return (
      <div className="loading-screen" data-testid="auth-callback-error">
        <p className="text-red-400 mt-4 text-sm">Authentication failed. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="loading-screen" data-testid="auth-callback">
      <div className="loading-spinner" />
      <p className="text-zinc-500 mt-4 text-sm">Signing you in...</p>
    </div>
  );
}
