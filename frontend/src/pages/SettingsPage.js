import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, LogOut, ChevronRight, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SettingsPage({ user }) {
  const navigate = useNavigate();
  const [maxTrades, setMaxTrades] = useState(5);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current settings
    if (user?.max_trades_per_day) {
      setMaxTrades(user.max_trades_per_day);
    }
    
    // Load reminder settings
    const loadReminders = async () => {
      try {
        const response = await fetch(`${API}/settings/reminders`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setReminderEnabled(data.daily_reminder_enabled || false);
          setReminderTime(data.reminder_time || '20:00');
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
      }
    };
    loadReminders();
  }, [user]);

  const handleMaxTradesChange = async (value) => {
    const newValue = Math.max(1, Math.min(20, value));
    setMaxTrades(newValue);
    
    try {
      await fetch(`${API}/settings/discipline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ max_trades_per_day: newValue })
      });
      toast.success('Max trades updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleReminderToggle = async () => {
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    
    try {
      await fetch(`${API}/settings/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          daily_reminder_enabled: newValue,
          reminder_time: reminderTime
        })
      });
      toast.success(newValue ? 'Reminders enabled' : 'Reminders disabled');
    } catch (error) {
      toast.error('Failed to update reminders');
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" data-testid="settings-page">
      {/* Header */}
      <header className="app-header">
        <h1 className="font-heading text-xl font-bold tracking-wider uppercase">Settings</h1>
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Profile Section */}
        <div className="animate-fadeIn">
          <p className="stat-label mb-3">Account</p>
          <div className="stat-card flex items-center gap-4" data-testid="profile-card">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-6 h-6 text-zinc-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-white" data-testid="user-name">{user?.name || 'Trader'}</p>
              <p className="text-xs text-zinc-500" data-testid="user-email">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Plan Info */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.05s' }}>
          <p className="stat-label mb-3">Plan</p>
          <div className="stat-card" data-testid="plan-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold">Free Plan</p>
                  <p className="text-xs text-zinc-500">14-day trade history</p>
                </div>
              </div>
              <button 
                className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase rounded hover:bg-zinc-200 transition-colors"
                data-testid="upgrade-btn"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>

        {/* Discipline Settings */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <p className="stat-label mb-3">Discipline Rules</p>
          <div className="stat-card" data-testid="discipline-settings">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">Max Trades Per Day</p>
                  <p className="text-xs text-zinc-500">Affects discipline score</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleMaxTradesChange(maxTrades - 1)}
                  className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg font-bold"
                  data-testid="max-trades-minus"
                >
                  -
                </button>
                <span className="font-mono text-lg w-8 text-center" data-testid="max-trades-value">{maxTrades}</span>
                <button 
                  onClick={() => handleMaxTradesChange(maxTrades + 1)}
                  className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg font-bold"
                  data-testid="max-trades-plus"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <p className="stat-label mb-3">Reminders</p>
          <div className="stat-card" data-testid="reminder-settings">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold">Daily Trade Reminder</p>
                  <p className="text-xs text-zinc-500">Get reminded to log trades</p>
                </div>
              </div>
              <button
                onClick={handleReminderToggle}
                className={`w-12 h-6 rounded-full transition-all ${
                  reminderEnabled ? 'bg-green-500' : 'bg-zinc-700'
                }`}
                data-testid="reminder-toggle"
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                  reminderEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {reminderEnabled && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <label className="text-xs text-zinc-500 block mb-2">Reminder Time</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="form-input w-32"
                  data-testid="reminder-time-input"
                />
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full stat-card flex items-center justify-between hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
            data-testid="logout-btn"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-semibold text-red-500">Log Out</span>
            </div>
            <ChevronRight className="w-5 h-5 text-red-500" />
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-zinc-600 pt-4">
          EdgeLog v1.0.0 • Made for traders
        </p>
      </div>

      <BottomNav active="settings" />
    </div>
  );
}
