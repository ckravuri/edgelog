import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Capacitor } from '@capacitor/core';

const API = process.env.REACT_APP_BACKEND_URL + "/api";

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

  useEffect(() => {
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

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleAppleLogin = () => {
    // Apple Sign-In will be implemented when Apple Developer account is ready
    alert('Apple Sign-In coming soon! Please use Google Sign-In for now.');
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
      
      {/* Login buttons */}
      <div className="w-full max-w-xs space-y-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <button 
          className="auth-btn" 
          onClick={handleGoogleLogin}
          data-testid="google-login-btn"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        
        <button 
          className="auth-btn bg-black text-white border border-white/20 hover:bg-zinc-900" 
          onClick={handleAppleLogin}
          data-testid="apple-login-btn"
        >
          <AppleIcon />
          Continue with Apple
        </button>
      </div>
      
      {/* Footer */}
      <p className="text-xs text-zinc-600 mt-12 text-center animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        By continuing, you agree to our{' '}
        <a href="/privacy" className="text-zinc-400 hover:text-white underline">Privacy Policy</a>
      </p>
    </div>
  );
}
