import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, TrendingUp, TrendingDown, Clock, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DisciplineRing from "@/components/DisciplineRing";
import TradeCard from "@/components/TradeCard";
import CloseTradeModal from "@/components/CloseTradeModal";
import EditTradeModal from "@/components/EditTradeModal";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [todayTrades, setTodayTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [modalType, setModalType] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, tradesRes] = await Promise.all([
        fetch(`${API}/analytics/summary`, { credentials: 'include' }),
        fetch(`${API}/trades/today`, { credentials: 'include' })
      ]);
      
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTodayTrades(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTradeClick = (trade) => {
    setSelectedTrade(trade);
    if (trade.outcome === 'open') {
      setModalType('close');
    } else {
      setModalType('edit');
    }
  };

  const handleModalClose = () => {
    setSelectedTrade(null);
    setModalType(null);
  };

  const handleTradeUpdated = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="loading-screen" data-testid="home-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page-content" data-testid="home-page">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1 className="logo-text">EDGELOG</h1>
          <p className="text-xs text-zinc-500 mt-1">Welcome, {user?.name?.split(' ')[0] || 'Trader'}</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
          data-testid="refresh-btn"
        >
          <RefreshCw className={`w-5 h-5 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Free Plan Banner */}
        <div className="countdown-banner animate-fadeIn" data-testid="countdown-banner">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="countdown-text">
              <span className="countdown-days">{analytics?.days_remaining || 14}</span> days of trade history remaining
            </span>
          </div>
          <span className="text-xs text-zinc-500">FREE PLAN</span>
        </div>

        {/* Discipline Score & Quick Stats */}
        <div className="flex items-center gap-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <DisciplineRing score={analytics?.discipline_score || 100} />
          
          <div className="flex-1 space-y-4">
            <div>
              <p className="stat-label">Today's Trades</p>
              <p className="font-mono text-2xl font-bold" data-testid="today-trades-count">
                {analytics?.today_trades || 0}
                <span className="text-sm text-zinc-500 font-normal">/{analytics?.max_trades_per_day || 5}</span>
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">WINS</p>
                <p className="font-mono text-lg text-green-500" data-testid="wins-count">{analytics?.wins || 0}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">LOSSES</p>
                <p className="font-mono text-lg text-red-500" data-testid="losses-count">{analytics?.losses || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card" data-testid="win-rate-card">
            <p className="stat-label">Win Rate</p>
            <p className="stat-value">{analytics?.win_rate || 0}%</p>
          </div>
          <div className="stat-card" data-testid="avg-rr-card">
            <p className="stat-label">Avg R:R</p>
            <p className="stat-value">1:{analytics?.avg_risk_reward?.toFixed(1) || '0.0'}</p>
          </div>
          <div className="stat-card" data-testid="total-pnl-card">
            <p className="stat-label">Total P&L</p>
            <p className={`stat-value ${(analytics?.total_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(analytics?.total_pnl || 0) >= 0 ? '+' : ''}{analytics?.total_pnl?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="stat-card" data-testid="total-trades-card">
            <p className="stat-label">Total Trades</p>
            <p className="stat-value">{analytics?.total_trades || 0}</p>
          </div>
        </div>

        {/* Today's Trades */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
              Today's Trades
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/history')}
                className="text-xs text-zinc-400 font-semibold uppercase tracking-wider hover:text-white transition-colors flex items-center gap-1"
                data-testid="view-history-link"
              >
                History <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => navigate('/add-trade')}
                className="text-xs text-green-500 font-semibold uppercase tracking-wider hover:text-green-400 transition-colors"
                data-testid="add-trade-link"
              >
                + Add Trade
              </button>
            </div>
          </div>
          
          {todayTrades.length > 0 ? (
            <div className="space-y-3" data-testid="trades-list">
              {todayTrades.map((trade, index) => (
                <div 
                  key={trade.trade_id} 
                  onClick={() => handleTradeClick(trade)}
                  className="cursor-pointer"
                >
                  <TradeCard trade={trade} style={{ animationDelay: `${0.1 * index}s` }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" data-testid="no-trades-message">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">No trades logged today</p>
              <p className="text-zinc-600 text-xs mt-1">Tap the + button to add your first trade</p>
            </div>
          )}
        </div>
      </div>

      {/* Close Trade Modal */}
      {selectedTrade && modalType === 'close' && (
        <CloseTradeModal
          trade={selectedTrade}
          onClose={handleModalClose}
          onTradeUpdated={handleTradeUpdated}
        />
      )}

      {/* Edit Trade Modal */}
      {selectedTrade && modalType === 'edit' && (
        <EditTradeModal
          trade={selectedTrade}
          onClose={handleModalClose}
          onTradeUpdated={handleTradeUpdated}
        />
      )}

      <BottomNav active="home" />
    </div>
  );
}
