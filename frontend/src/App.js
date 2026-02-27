import React, { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { MonetizationProvider } from "@/context/MonetizationContext";
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// Pages
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import HomePage from "@/pages/HomePage";
import AddTradePage from "@/pages/AddTradePage";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import HistoryPage from "@/pages/HistoryPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import PremiumPage from "@/pages/PremiumPage";
import ImportPage from "@/pages/ImportPage";
import TermsPage from "@/pages/TermsPage";
import ProtectedRoute from "@/components/ProtectedRoute";

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check for session_id synchronously during render
  // This prevents race conditions - session_id must be processed BEFORE ProtectedRoute runs
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />
      <Route path="/add-trade" element={
        <ProtectedRoute>
          <AddTradePage />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      } />
      <Route path="/premium" element={
        <ProtectedRoute>
          <PremiumPage />
        </ProtectedRoute>
      } />
      <Route path="/import" element={
        <ProtectedRoute>
          <ImportPage />
        </ProtectedRoute>
      } />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [userId, setUserId] = useState(null);
  const [deepLinkToken, setDeepLinkToken] = useState(null);

  // Handle deep links for native auth callback
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Listen for app URL open events (deep links)
      CapApp.addListener('appUrlOpen', async (event) => {
        console.log('Deep link received:', event.url);
        
        // Parse the URL: edgelog://auth?token=xxx
        const url = new URL(event.url);
        if (url.host === 'auth' && url.searchParams.has('token')) {
          const token = url.searchParams.get('token');
          console.log('Auth token received from deep link');
          
          // Store the token and trigger auth
          document.cookie = `session_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`;
          setDeepLinkToken(token);
          
          // Force reload to pick up the new auth state
          window.location.href = '/';
        }
      });
      
      // Check if app was opened with a URL
      CapApp.getLaunchUrl().then((result) => {
        if (result && result.url) {
          console.log('App launched with URL:', result.url);
          const url = new URL(result.url);
          if (url.host === 'auth' && url.searchParams.has('token')) {
            const token = url.searchParams.get('token');
            document.cookie = `session_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`;
            setDeepLinkToken(token);
            window.location.href = '/';
          }
        }
      });
    }
  }, []);

  // Get user ID from session storage for RevenueCat linking
  useEffect(() => {
    const storedUser = sessionStorage.getItem('edgelog_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.user_id);
      } catch (e) {
        console.warn('Failed to parse stored user');
      }
    }
  }, []);

  return (
    <div className="app-container">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />
      
      <MonetizationProvider userId={userId}>
        <BrowserRouter>
          <AppRouter />
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: '#0A0A0A',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
              },
            }}
          />
        </BrowserRouter>
      </MonetizationProvider>
    </div>
  );
}

export default App;
