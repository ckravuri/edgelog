import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart3, Settings, Plus } from "lucide-react";

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'add', icon: Plus, label: 'Add', path: '/add-trade', isCenter: true },
    { id: 'dashboard', icon: BarChart3, label: 'Analytics', path: '/dashboard' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      {navItems.map((item) => {
        if (item.isCenter) {
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="add-trade-btn"
              data-testid="add-trade-nav-btn"
            >
              <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
            </button>
          );
        }
        
        const Icon = item.icon;
        const isActive = active === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`nav-item ${isActive ? 'active' : ''}`}
            data-testid={`nav-${item.id}`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
