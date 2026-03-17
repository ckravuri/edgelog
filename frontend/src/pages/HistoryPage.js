import { authFetch } from "@/utils/authFetch";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Search, TrendingUp, TrendingDown, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TradeCard from "@/components/TradeCard";
import CloseTradeModal from "@/components/CloseTradeModal";
import EditTradeModal from "@/components/EditTradeModal";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const FILTERS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'win', label: 'Wins', icon: TrendingUp },
  { id: 'loss', label: 'Losses', icon: TrendingDown },
];

export default function HistoryPage({ user }) {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [modalType, setModalType] = useState(null); // 'close' or 'edit'

  const fetchTrades = useCallback(async () => {
    try {
      const response = await authFetch('/trades';
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
        setFilteredTrades(data);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Filter trades
  useEffect(() => {
    let result = [...trades];

    // Apply status filter
    if (activeFilter !== 'all') {
      result = result.filter(trade => trade.outcome === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toUpperCase();
      result = result.filter(trade => 
        trade.trading_pair?.toUpperCase().includes(query)
      );
    }

    setFilteredTrades(result);
  }, [trades, activeFilter, searchQuery]);

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
    fetchTrades();
  };

  // Calculate summary stats
  const totalTrades = filteredTrades.length;
  const totalPnl = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = filteredTrades.filter(t => t.outcome === 'win').length;
  const losses = filteredTrades.filter(t => t.outcome === 'loss').length;

  if (loading) {
    return (
      <div className="loading-screen" data-testid="history-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page-content" data-testid="history-page">
      {/* Header */}
      <header className="app-header">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-wider uppercase">Trade History</h1>
        <div className="w-9" />
      </header>

      {/* Search */}
      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by trading pair..."
            className="form-input pl-11 h-11"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 pt-4 flex gap-2 overflow-x-auto hide-scrollbar" data-testid="filters">
        {FILTERS.map(filter => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
              data-testid={`filter-${filter.id}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
          <div className="text-center">
            <p className="font-mono text-lg font-bold">{totalTrades}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Trades</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="font-mono text-lg font-bold text-green-500">{wins}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Wins</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="font-mono text-lg font-bold text-red-500">{losses}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Losses</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className={`font-mono text-lg font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">P&L</p>
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="px-5 py-6">
        {filteredTrades.length > 0 ? (
          <div className="space-y-3" data-testid="trade-list">
            {filteredTrades.map((trade, index) => (
              <div 
                key={trade.trade_id} 
                onClick={() => handleTradeClick(trade)}
                className="cursor-pointer"
              >
                <TradeCard 
                  trade={trade} 
                  style={{ animationDelay: `${0.05 * index}s` }} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Filter className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">No trades found</p>
            <p className="text-zinc-600 text-xs mt-1">
              {searchQuery ? 'Try a different search' : 'Adjust your filters'}
            </p>
          </div>
        )}
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
