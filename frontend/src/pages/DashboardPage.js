import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LineChart, Line, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, dailyRes] = await Promise.all([
        fetch(`${API}/analytics/summary`, { credentials: 'include' }),
        fetch(`${API}/analytics/daily`, { credentials: 'include' })
      ]);
      
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate cumulative P&L for equity curve
  const equityCurveData = useMemo(() => {
    if (!dailyData.length) return [];
    
    let cumulative = 0;
    return dailyData.map(day => {
      cumulative += day.pnl || 0;
      return {
        ...day,
        equity: cumulative
      };
    });
  }, [dailyData]);

  if (loading) {
    return (
      <div className="loading-screen" data-testid="dashboard-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded p-3">
          <p className="text-xs text-zinc-400 mb-1">{label}</p>
          <p className={`font-mono text-sm ${payload[0].value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            P&L: {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const EquityTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded p-3">
          <p className="text-xs text-zinc-400 mb-1">{label}</p>
          <p className={`font-mono text-sm ${payload[0].value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Equity: {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-content" data-testid="dashboard-page">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider uppercase">Analytics</h1>
          <p className="text-xs text-zinc-500 mt-1">Last 14 days performance</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-5 pt-4 gap-2" data-testid="dashboard-tabs">
        {['overview', 'performance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-white text-black'
                : 'bg-white/5 text-zinc-500 hover:bg-white/10'
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={() => navigate('/reports')}
          className="ml-auto px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-400 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 flex items-center gap-1.5 transition-all"
          data-testid="ai-reports-btn"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Report
        </button>
      </div>

      <div className="px-5 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
              <div className="stat-card flex items-center gap-3" data-testid="total-trades-stat">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="stat-label">Total Trades</p>
                  <p className="font-mono text-xl font-bold">{analytics?.total_trades || 0}</p>
                </div>
              </div>
              
              <div className="stat-card flex items-center gap-3" data-testid="win-rate-stat">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="stat-label">Win Rate</p>
                  <p className="font-mono text-xl font-bold">{analytics?.win_rate || 0}%</p>
                </div>
              </div>
              
              <div className="stat-card flex items-center gap-3" data-testid="wins-stat">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="stat-label">Wins</p>
                  <p className="font-mono text-xl font-bold text-green-500">{analytics?.wins || 0}</p>
                </div>
              </div>
              
              <div className="stat-card flex items-center gap-3" data-testid="losses-stat">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="stat-label">Losses</p>
                  <p className="font-mono text-xl font-bold text-red-500">{analytics?.losses || 0}</p>
                </div>
              </div>
            </div>

            {/* Win/Loss Bar Chart */}
            <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.1s' }} data-testid="win-loss-chart">
              <p className="stat-label mb-4">Win/Loss Distribution</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Wins', value: analytics?.wins || 0 },
                      { name: 'Losses', value: analytics?.losses || 0 },
                      { name: 'B/E', value: analytics?.breakevens || 0 },
                      { name: 'Open', value: analytics?.open_trades || 0 }
                    ]}
                    layout="vertical"
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={50} tick={{ fill: '#71717A', fontSize: 11 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {[
                        { color: '#22C55E' },
                        { color: '#EF4444' },
                        { color: '#94A3B8' },
                        { color: '#3B82F6' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.2s' }} data-testid="key-metrics">
              <p className="stat-label mb-4">Key Metrics</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Total P&L</span>
                  <span className={`font-mono font-bold ${
                    (analytics?.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {(analytics?.total_pnl || 0) >= 0 ? '+' : ''}{analytics?.total_pnl?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Avg Risk:Reward</span>
                  <span className="font-mono font-bold">1:{analytics?.avg_risk_reward?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Discipline Score</span>
                  <span className={`font-mono font-bold ${
                    analytics?.discipline_score >= 80 ? 'text-green-500' : 
                    analytics?.discipline_score >= 50 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {analytics?.discipline_score || 100}/100
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Equity Curve - NEW */}
            <div className="stat-card animate-fadeIn" data-testid="equity-curve">
              <p className="stat-label mb-4">Equity Curve</p>
              {equityCurveData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop 
                            offset="5%" 
                            stopColor={equityCurveData[equityCurveData.length - 1]?.equity >= 0 ? '#22C55E' : '#EF4444'} 
                            stopOpacity={0.3}
                          />
                          <stop 
                            offset="95%" 
                            stopColor={equityCurveData[equityCurveData.length - 1]?.equity >= 0 ? '#22C55E' : '#EF4444'} 
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#71717A', fontSize: 10 }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                      <Tooltip content={<EquityTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="equity" 
                        stroke={equityCurveData[equityCurveData.length - 1]?.equity >= 0 ? '#22C55E' : '#EF4444'}
                        strokeWidth={2}
                        fill="url(#equityGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
                  No trade data yet
                </div>
              )}
            </div>

            {/* P&L Chart */}
            <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.1s' }} data-testid="pnl-chart">
              <p className="stat-label mb-4">Daily P&L</p>
              {dailyData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#71717A', fontSize: 10 }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {dailyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
                  No trade data yet
                </div>
              )}
            </div>

            {/* Daily Trades Chart */}
            <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.2s' }} data-testid="trades-chart">
              <p className="stat-label mb-4">Daily Trade Count</p>
              {dailyData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#71717A', fontSize: 10 }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                      <Line 
                        type="monotone" 
                        dataKey="trades" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">
                  No trade data yet
                </div>
              )}
            </div>

            {/* Daily Win/Loss */}
            {dailyData.length > 0 && (
              <div className="stat-card animate-fadeIn" style={{ animationDelay: '0.3s' }} data-testid="daily-breakdown">
                <p className="stat-label mb-4">Daily Breakdown</p>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {dailyData.slice().reverse().map((day, index) => (
                    <div 
                      key={day.date}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="text-sm text-white font-medium">{day.date}</p>
                        <p className="text-xs text-zinc-500">
                          {day.trades} trades • {day.wins}W / {day.losses}L
                        </p>
                      </div>
                      <span className={`font-mono text-sm font-bold ${
                        day.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="dashboard" />
    </div>
  );
}
