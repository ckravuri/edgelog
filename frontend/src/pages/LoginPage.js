import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const authCheckRef = useRef(false);
  const pollRef = useRef(null);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('session_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include',
          headers
        });
        if (response.ok) {
          navigate('/', { replace: true });
        }
      } catch (err) {
        // Not authenticated
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    if (isNative) {
      // Generate unique auth request ID
      const authRequestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      console.log('[Auth] Generated auth_request_id:', authRequestId);

      // Use the backend-served callback route (dynamic API URL, no caching)
      const callbackUrl = `${BACKEND_URL}/api/auth/native-callback?auth_request_id=${authRequestId}`;
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;

      // Start polling IMMEDIATELY in background (1s intervals)
      pollRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${API}/auth/native/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_request_id: authRequestId }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[Auth] Token retrieved via polling!');
            clearInterval(pollRef.current);
            pollRef.current = null;

            localStorage.setItem('session_token', data.session_token);

            try { await Browser.close(); } catch (e) { /* ok */ }

            setIsLoading(false);
            navigate('/', { replace: true });
          }
        } catch (err) {
          // Ignore — token not ready yet
        }
      }, 1500);

      // Timeout polling after 90 seconds
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          console.log('[Auth] Polling timeout');
          setIsLoading(false);
        }
      }, 90000);

      try {
        // Listen for browser close event (user closed manually or deep link worked)
        const listener = await Browser.addListener('browserFinished', async () => {
          console.log('[Auth] Browser finished event');

          // Give a final moment for the store to complete
          await new Promise(r => setTimeout(r, 1000));

          // One last retrieval attempt
          try {
            const response = await fetch(`${API}/auth/native/retrieve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ auth_request_id: authRequestId }),
            });
            if (response.ok) {
              const data = await response.json();
              localStorage.setItem('session_token', data.session_token);
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
              navigate('/', { replace: true });
            }
          } catch (e) { /* ok */ }

          setIsLoading(false);
          listener.remove();
        });

        await Browser.open({
          url: authUrl,
          presentationStyle: 'popover'
        });
      } catch (err) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        console.error('[Auth] Browser open error:', err);
        setError('Failed to open authentication');
        setIsLoading(false);
      }
    } else {
      // Web — redirect directly
      const redirectUrl = window.location.origin + '/';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      window.location.href = authUrl;
    }
  };

  if (isChecking) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="auth-screen" data-testid="login-page">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex items-center gap-3 mb-4 animate-fadeIn">
        <img src="/edgelog-logo.png" alt="EdgeLog" className="w-24 h-24 rounded-2xl" />
      </div>

      <h1 className="auth-logo animate-fadeIn" style={{ animationDelay: '0.1s' }} data-testid="app-logo">
        EDGELOG
      </h1>

      <p className="auth-tagline animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        Your Trading Edge, Journaled
      </p>

      {error && (
        <div className="w-full max-w-xs mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center animate-fadeIn">
          {error}
        </div>
      )}

      <div className="w-full max-w-xs space-y-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <button
          className="auth-btn"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          data-testid="google-login-btn"
        >
          <GoogleIcon />
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </div>

      <p className="text-xs text-zinc-600 mt-12 text-center animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        By continuing, you agree to our{' '}
        <a href="/privacy" className="text-zinc-400 hover:text-white underline">Privacy Policy</a>
        {' '}and{' '}
        <a href="/terms" className="text-zinc-400 hover:text-white underline">Terms of Service</a>
      </p>
    </div>
  );
}
