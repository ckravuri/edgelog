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

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const authCheckRef = useRef(false);

  // Check if running on iOS native app
  const isIosNative = Capacitor.getPlatform() === 'ios';
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Prevent multiple auth checks
    if (authCheckRef.current) return;
    authCheckRef.current = true;
    
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          navigate('/', { replace: true });
        }
      } catch (error) {
        // Not authenticated, stay on login
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    if (isNative) {
      // For native: Use a two-step process
      // 1. Open auth in browser, which redirects to backend
      // 2. Backend page exchanges session_id and stores it, then shows "return to app" page
      // 3. When browser closes, we poll /auth/check-native to get the session
      
      // Generate a unique device token for this auth attempt
      const deviceToken = Math.random().toString(36).substring(7) + Date.now();
      sessionStorage.setItem('native_auth_device', deviceToken);
      
      // Redirect to static auth callback page (doesn't require React to load)
      const redirectUrl = BACKEND_URL + '/auth-callback.html';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      try {
        // Add listener for browser finished
        const listener = await Browser.addListener('browserFinished', async () => {
          setIsLoading(true);
          // When browser closes, check if we're now authenticated
          await pollForAuth();
          listener.remove();
        });
        
        await Browser.open({ 
          url: authUrl,
          presentationStyle: 'popover'
        });
      } catch (err) {
        console.error('Browser open error:', err);
        setError('Failed to open authentication');
        setIsLoading(false);
      }
    } else {
      // Web - use normal redirect with current origin
      const redirectUrl = window.location.origin + '/';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      window.location.href = authUrl;
    }
  };
  
  const pollForAuth = async () => {
    // Poll the auth/me endpoint to check if auth was successful
    // The in-app browser and native webview share cookies on iOS
    // On Android, we need a different approach
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          sessionStorage.setItem('edgelog_user', JSON.stringify(userData));
          navigate('/', { replace: true });
          return true;
        }
      } catch (error) {
        console.log('Auth check failed, retrying...');
      }
      return false;
    };
    
    while (attempts < maxAttempts) {
      const success = await checkAuth();
      if (success) {
        setIsLoading(false);
        return;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsLoading(false);
    setError('Authentication timed out. Please try again.');
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import the plugin only on iOS
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      
      const options = {
        clientId: 'com.ravuri.edgelog',
        redirectURI: window.location.origin,
        scopes: 'email name',
        state: Math.random().toString(36).substring(7),
        nonce: Math.random().toString(36).substring(7),
      };

      const result = await SignInWithApple.authorize(options);
      
      if (result.response && result.response.identityToken) {
        // Send token to backend for verification
        const backendResponse = await fetch(`${API}/auth/apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            identity_token: result.response.identityToken,
            user_id: result.response.user,
            email: result.response.email,
            name: result.response.givenName 
              ? `${result.response.givenName} ${result.response.familyName || ''}`.trim()
              : null,
          }),
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json();
          throw new Error(errorData.detail || 'Authentication failed');
        }

        // Success - navigate to home
        navigate('/', { replace: true });
      } else {
        throw new Error('Failed to get identity token from Apple');
      }
    } catch (err) {
      console.error('Apple Sign-In error:', err);
      setError(err.message || 'Apple Sign-In failed. Please try again.');
    } finally {
      setIsLoading(false);
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
      {/* Background glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-4 animate-fadeIn">
        <TrendingUp className="w-10 h-10 text-green-500" strokeWidth={1.5} />
      </div>
      
      <h1 className="auth-logo animate-fadeIn" style={{ animationDelay: '0.1s' }} data-testid="app-logo">
        EDGELOG
      </h1>
      
      <p className="auth-tagline animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        Your Trading Edge, Journaled
      </p>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-xs mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center animate-fadeIn">
          {error}
        </div>
      )}
      
      {/* Login buttons */}
      <div className="w-full max-w-xs space-y-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <button 
          className="auth-btn" 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          data-testid="google-login-btn"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        
        {/* Show Apple Sign-In only on iOS */}
        {isIosNative && (
          <button 
            className="auth-btn bg-black text-white border border-white/20 hover:bg-zinc-900" 
            onClick={handleAppleLogin}
            disabled={isLoading}
            data-testid="apple-login-btn"
          >
            <AppleIcon />
            {isLoading ? 'Signing in...' : 'Continue with Apple'}
          </button>
        )}
      </div>
      
      {/* Footer */}
      <p className="text-xs text-zinc-600 mt-12 text-center animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        By continuing, you agree to our{' '}
        <a href="/privacy" className="text-zinc-400 hover:text-white underline">Privacy Policy</a>
        {' '}and{' '}
        <a href="/terms" className="text-zinc-400 hover:text-white underline">Terms of Service</a>
      </p>
    </div>
  );
}
