import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // If user data passed from AuthCallback, start as authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    // Skip if user was passed from AuthCallback
    if (location.state?.user) return;
    
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };
    
    checkAuth();
  }, [navigate, location.state]);

  // Show loading while checking
  if (isAuthenticated === null) {
    return (
      <div className="loading-screen" data-testid="auth-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not authenticated
  if (isAuthenticated === false) {
    return null;
  }

  // Clone children with user prop
  return React.cloneElement(children, { user });
}
