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

  // Handle auth_token from URL (web-based fallback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    if (authToken) {
      console.log('Auth token received from URL');
      document.cookie = `session_token=${authToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    }
  }, []);

  // Handle deep links for native auth callback
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const API = process.env.REACT_APP_BACKEND_URL + '/api';

      const handleDeepLink = async (url) => {
        console.log('[DeepLink] Processing:', url);
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.host === 'auth') {
            const authRequestId = parsedUrl.searchParams.get('auth_request_id');
            const status = parsedUrl.searchParams.get('status');

            if (authRequestId && status === 'success') {
              console.log('[DeepLink] Auth success, fetching token...');
              const response = await fetch(`${API}/auth/native/retrieve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_request_id: authRequestId }),
              });

              if (response.ok) {
                const data = await response.json();
                localStorage.setItem('session_token', data.session_token);
                window.location.href = '/';
              }
            }

            if (parsedUrl.searchParams.has('token')) {
              const token = parsedUrl.searchParams.get('token');
              localStorage.setItem('session_token', token);
              window.location.href = '/';
            }
          }
        } catch (e) {
          console.error('[DeepLink] Error:', e);
        }
      };

      CapApp.addListener('appUrlOpen', async (event) => {
        console.log('[DeepLink] Received:', event.url);
        await handleDeepLink(event.url);
      });

      CapApp.getLaunchUrl().then(async (result) => {
        if (result && result.url) {
          console.log('[DeepLink] Launch URL:', result.url);
          await handleDeepLink(result.url);
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
