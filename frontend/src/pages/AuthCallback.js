import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL hash
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
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
        
        // Clear the hash from URL and navigate to home with user data
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true, state: { user: data.user } });
        
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login', { replace: true });
      }
    };
    
    processAuth();
  }, [navigate]);

  return (
    <div className="loading-screen" data-testid="auth-callback">
      <div className="loading-spinner" />
      <p className="text-zinc-500 mt-4 text-sm">Signing you in...</p>
    </div>
  );
}
