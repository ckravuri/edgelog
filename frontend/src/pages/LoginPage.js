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

  // Check platform
  const isIosNative = Capacitor.getPlatform() === 'ios';
  const isAndroidNative = Capacitor.getPlatform() === 'android';
  const isNative = Capacitor.isNativePlatform();
  
  // Apple Sign-In ONLY works on native iOS (not web, not Android)
  // Web requires a separate Service ID configured in Apple Developer Console
  const showAppleSignIn = isIosNative;

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
      // Generate a unique auth request ID
      const authRequestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('native_auth_request_id', authRequestId);
      
      // Redirect to auth callback with auth_request_id
      const redirectUrl = BACKEND_URL + '/auth-callback.html?auth_request_id=' + authRequestId;
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      try {
        // Add listener for browser finished
        const listener = await Browser.addListener('browserFinished', async () => {
          setIsLoading(true);
          // When browser closes, poll for the auth token
          await pollForNativeAuth(authRequestId);
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
  
  const pollForNativeAuth = async (authRequestId) => {
    // Poll the server to retrieve the stored auth token
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API}/auth/native/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_request_id: authRequestId }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const sessionToken = data.session_token;
          
          // Store the token as cookie
          document.cookie = `session_token=${sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
          
          // Navigate to home
          setIsLoading(false);
          navigate('/', { replace: true });
          return;
        } else if (response.status === 404) {
          // Token not stored yet, keep polling
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          // Other error
          break;
        }
      } catch (error) {
        console.log('Poll attempt', attempts + 1);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      attempts++;
    }
    
    setIsLoading(false);
    // Don't show error - the user might have cancelled
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import the plugin only on iOS
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      
      // For native iOS apps - minimal options, iOS handles the rest automatically
      // Do NOT include clientId or redirectURI for native iOS - it uses bundle ID automatically
      const options = {
        scopes: 'email name',
      };

      console.log('Starting Apple Sign-In with native options');
      const result = await SignInWithApple.authorize(options);
      console.log('Apple Sign-In result received');
      
      if (result.response && result.response.identityToken) {
        console.log('Got identity token, sending to backend...');
        console.log('API URL:', API);
        
        // Send token to backend for verification
        let backendResponse;
        try {
          console.log('Making fetch request to:', `${API}/auth/apple`);
          backendResponse = await fetch(`${API}/auth/apple`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              identity_token: result.response.identityToken,
              user_id: result.response.user,
              email: result.response.email,
              name: result.response.givenName 
                ? `${result.response.givenName} ${result.response.familyName || ''}`.trim()
                : null,
            }),
          });
          console.log('Fetch completed, status:', backendResponse.status);
        } catch (fetchError) {
          console.error('Fetch error name:', fetchError.name);
          console.error('Fetch error message:', fetchError.message);
          console.error('Fetch error:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
          throw new Error(`Network error: ${fetchError.message || 'Unknown'}. API: ${API}`);
        }

        console.log('Backend response status:', backendResponse.status);
        
        if (!backendResponse.ok) {
          const errorData = await backendResponse.json();
          console.error('Backend error:', errorData);
          throw new Error(errorData.detail || 'Authentication failed');
        }

        const responseData = await backendResponse.json();
        console.log('Auth successful, navigating to home');
        
        // Store the session token for native platforms
        if (responseData.session_token) {
          document.cookie = `session_token=${responseData.session_token}; path=/; max-age=${7 * 24 * 60 * 60}`;
        }
        
        // Success - navigate to home
        navigate('/', { replace: true });
      } else {
        console.error('No identity token in result:', result);
        throw new Error('Failed to get identity token from Apple');
      }
    } catch (err) {
      console.error('Apple Sign-In error:', err);
      // Provide more specific error messages
      let errorMessage = 'Apple Sign-In failed. Please try again.';
      if (err.message) {
        if (err.message.includes('canceled') || err.message.includes('cancelled')) {
          errorMessage = 'Sign-in was cancelled.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
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
        
        {/* Show Apple Sign-In on iOS and web preview (not on Android) */}
        {showAppleSignIn && (
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
