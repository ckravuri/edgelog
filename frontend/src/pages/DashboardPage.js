import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LineChart, Line, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/utils/authFetch";

export default function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, dailyRes, tradesRes] = await Promise.all([
        authFetch('/analytics/summary'),
        authFetch('/analytics/daily'),
        authFetch('/trades')
      ]);
      
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyData(data);
      }
      
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setAllTrades(data);
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
    if (!allTrades.length) return [];
    
    // Sort trades by date and calculate cumulative P&L
    const sortedTrades = [...allTrades]
      .filter(t => t.outcome !== 'open' && t.pnl !== null)
      .sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));
    
    let cumulative = 0;
    return sortedTrades.map((trade, index) => {
      cumulative += trade.pnl || 0;
      return {
        trade: index + 1,
        date: new Date(trade.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: trade.pnl,
        equity: cumulative,
        pair: trade.trading_pair
      };
    });
  }, [allTrades]);

  // Calculate performance by trading pair
  const pairPerformance = useMemo(() => {
    if (!allTrades.length) return [];
    
    const pairStats = {};
    
    allTrades.forEach(trade => {
      const pair = trade.trading_pair;
      if (!pairStats[pair]) {
        pairStats[pair] = {
          pair,
          trades: 0,
          wins: 0,
          losses: 0,
          totalPnl: 0
        };
      }
      
      pairStats[pair].trades++;
      if (trade.outcome === 'win') pairStats[pair].wins++;
      if (trade.outcome === 'loss') pairStats[pair].losses++;
      if (trade.pnl) pairStats[pair].totalPnl += trade.pnl;
    });
    
    return Object.values(pairStats)
      .sort((a, b) => b.trades - a.trades);
  }, [allTrades]);

  if (loading) {
    return (
      <div className="loading-screen" data-testid="dashboard-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const EquityTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
          <p className="text-xs text-zinc-400 mb-1">{payload[0].payload.date}</p>
          <p className="text-xs text-zinc-400 mb-1">{payload[0].payload.pair}</p>
          <p className={`font-mono text-sm ${payload[0].value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Equity: {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container" data-testid="dashboard-page">
      <header className="header">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-xs text-zinc-500 mt-1">Your trading performance</p>
        </div>
      </header>

      <main className="main-content pb-24">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'equity', 'pairs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-green-500 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <button
            onClick={() => navigate('/reports')}
            className="ml-auto px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            AI Report
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-zinc-500">Total Trades</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.total_trades || 0}</p>
              </div>
              
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-zinc-500">Win Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {analytics?.total_trades > 0 
                    ? `${((analytics?.wins || 0) / (analytics?.wins + analytics?.losses || 1) * 100).toFixed(0)}%`
                    : '0%'}
                </p>
              </div>
              
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  {(analytics?.total_pnl || 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs text-zinc-500">Total P&L</span>
                </div>
                <p className={`text-2xl font-bold ${(analytics?.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(analytics?.total_pnl || 0) >= 0 ? '+' : ''}{(analytics?.total_pnl || 0).toFixed(2)}
                </p>
              </div>
              
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-zinc-500">Avg RRR</span>
                </div>
                <p className="text-2xl font-bold">{(analytics?.avg_risk_reward || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Win/Loss/Open Stats */}
            <div className="card">
              <h3 className="text-sm font-medium mb-3">Trade Outcomes</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-500">{analytics?.wins || 0}</p>
                  <p className="text-xs text-zinc-500">Wins</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-500">{analytics?.losses || 0}</p>
                  <p className="text-xs text-zinc-500">Losses</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-400">{analytics?.breakevens || 0}</p>
                  <p className="text-xs text-zinc-500">B/E</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-500">{analytics?.open_trades || 0}</p>
                  <p className="text-xs text-zinc-500">Open</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equity Tab */}
        {activeTab === 'equity' && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-medium mb-4">Equity Curve</h3>
              {equityCurveData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="trade" 
                      tick={{ fontSize: 10, fill: '#666' }} 
                      stroke="#666"
                      label={{ value: 'Trade #', position: 'insideBottom', offset: -5, fill: '#666', fontSize: 10 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#666' }} 
                      stroke="#666"
                      label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10 }}
                    />
                    <Tooltip content={<EquityTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#22c55e" 
                      fill="url(#equityGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <p>No closed trades yet</p>
                  <p className="text-xs mt-1">Close some trades to see your equity curve</p>
                </div>
              )}
            </div>
            
            {/* P&L by Trade */}
            {equityCurveData.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-medium mb-4">P&L by Trade</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="trade" tick={{ fontSize: 10, fill: '#666' }} stroke="#666" />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} stroke="#666" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {equityCurveData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Pairs Tab */}
        {activeTab === 'pairs' && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-medium mb-4">Performance by Pair</h3>
              {pairPerformance.length > 0 ? (
                <div className="space-y-3">
                  {pairPerformance.map((pair, index) => (
                    <div 
                      key={pair.pair} 
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 w-4">{index + 1}</span>
                        <div>
                          <p className="font-medium">{pair.pair}</p>
                          <p className="text-xs text-zinc-500">
                            {pair.trades} trade{pair.trades !== 1 ? 's' : ''} • 
                            {pair.wins}W / {pair.losses}L
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${pair.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pair.totalPnl >= 0 ? '+' : ''}{pair.totalPnl.toFixed(2)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {pair.trades > 0 ? ((pair.wins / pair.trades) * 100).toFixed(0) : 0}% WR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <p>No trades logged yet</p>
                  <p className="text-xs mt-1">Start logging trades to see pair performance</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
