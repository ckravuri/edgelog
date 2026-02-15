import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Pages
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import HomePage from "@/pages/HomePage";
import AddTradePage from "@/pages/AddTradePage";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="app-container">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />
      
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
    </div>
  );
}

export default App;
