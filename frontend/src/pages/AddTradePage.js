import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, X } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const COMMON_PAIRS = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 
  'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'GBPJPY'
];

const EMOTIONS = ['Confident', 'Anxious', 'Neutral', 'FOMO', 'Revenge', 'Disciplined'];

export default function AddTradePage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  
  const [form, setForm] = useState({
    trading_pair: '',
    trade_type: 'buy',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    lot_size: '0.01',
    trade_date: new Date().toISOString().slice(0, 16),
    notes: '',
    emotion_before: ''
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.trading_pair || !form.entry_price || !form.lot_size) {
      toast.error('Please fill in required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        ...form,
        entry_price: parseFloat(form.entry_price),
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
        take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
        lot_size: parseFloat(form.lot_size),
        trade_date: new Date(form.trade_date).toISOString()
      };
      
      const response = await fetch(`${API}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trade');
      }
      
      toast.success('Trade logged successfully!');
      navigate('/');
      
    } catch (error) {
      console.error('Error creating trade:', error);
      toast.error('Failed to log trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" data-testid="add-trade-page">
      {/* Header */}
      <header className="app-header">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-wider uppercase">New Trade</h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
        {/* Trading Pair */}
        <div className="form-group animate-fadeIn">
          <label className="form-label">Trading Pair *</label>
          <div className="relative">
            <input
              type="text"
              value={form.trading_pair}
              onChange={(e) => handleChange('trading_pair', e.target.value.toUpperCase())}
              onFocus={() => setShowPairs(true)}
              placeholder="e.g., XAUUSD"
              className="form-input uppercase font-mono"
              data-testid="trading-pair-input"
            />
            {showPairs && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg p-2 z-10" data-testid="pairs-dropdown">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Popular Pairs</span>
                  <button type="button" onClick={() => setShowPairs(false)}>
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_PAIRS.map(pair => (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => {
                        handleChange('trading_pair', pair);
                        setShowPairs(false);
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs font-mono transition-colors"
                      data-testid={`pair-${pair}`}
                    >
                      {pair}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trade Type */}
        <div className="form-group animate-fadeIn" style={{ animationDelay: '0.05s' }}>
          <label className="form-label">Direction *</label>
          <div className="trade-type-toggle">
            <button
              type="button"
              onClick={() => handleChange('trade_type', 'buy')}
              className={`trade-type-btn buy ${form.trade_type === 'buy' ? 'active' : ''}`}
              data-testid="buy-btn"
            >
              <span className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" /> Buy
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleChange('trade_type', 'sell')}
              className={`trade-type-btn sell ${form.trade_type === 'sell' ? 'active' : ''}`}
              data-testid="sell-btn"
            >
              <span className="flex items-center justify-center gap-2">
                <TrendingDown className="w-5 h-5" /> Sell
              </span>
            </button>
          </div>
        </div>

        {/* Price Grid */}
        <div className="grid grid-cols-2 gap-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="form-group !mb-0">
            <label className="form-label">Entry Price *</label>
            <input
              type="number"
              step="any"
              value={form.entry_price}
              onChange={(e) => handleChange('entry_price', e.target.value)}
              placeholder="0.00"
              className="form-input font-mono"
              data-testid="entry-price-input"
            />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Lot Size *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.lot_size}
              onChange={(e) => handleChange('lot_size', e.target.value)}
              placeholder="0.01"
              className="form-input font-mono"
              data-testid="lot-size-input"
            />
          </div>
        </div>

        {/* SL/TP Grid */}
        <div className="grid grid-cols-2 gap-4 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="form-group !mb-0">
            <label className="form-label">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={form.stop_loss}
              onChange={(e) => handleChange('stop_loss', e.target.value)}
              placeholder="Optional"
              className="form-input font-mono border-red-500/30 focus:border-red-500/50"
              data-testid="stop-loss-input"
            />
          </div>
          <div className="form-group !mb-0">
            <label className="form-label">Take Profit</label>
            <input
              type="number"
              step="any"
              value={form.take_profit}
              onChange={(e) => handleChange('take_profit', e.target.value)}
              placeholder="Optional"
              className="form-input font-mono border-green-500/30 focus:border-green-500/50"
              data-testid="take-profit-input"
            />
          </div>
        </div>

        {/* Date/Time */}
        <div className="form-group animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <label className="form-label">Trade Date & Time *</label>
          <input
            type="datetime-local"
            value={form.trade_date}
            onChange={(e) => handleChange('trade_date', e.target.value)}
            className="form-input"
            data-testid="trade-date-input"
          />
        </div>

        {/* Emotion */}
        <div className="form-group animate-fadeIn" style={{ animationDelay: '0.25s' }}>
          <label className="form-label">Emotion Before Trade</label>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map(emotion => (
              <button
                key={emotion}
                type="button"
                onClick={() => handleChange('emotion_before', emotion.toLowerCase())}
                className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                  form.emotion_before === emotion.toLowerCase()
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
                data-testid={`emotion-${emotion.toLowerCase()}`}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <label className="form-label">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Trade setup, market conditions, thoughts..."
            rows={3}
            className="form-input h-auto py-3 resize-none"
            data-testid="notes-input"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full h-14 rounded font-heading text-lg font-bold uppercase tracking-wider transition-all ${
            form.trade_type === 'buy'
              ? 'bg-green-600 hover:bg-green-500 text-white buy-glow'
              : 'bg-red-600 hover:bg-red-500 text-white sell-glow'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          data-testid="submit-trade-btn"
        >
          {loading ? 'Logging...' : `Log ${form.trade_type.toUpperCase()} Trade`}
        </button>
      </form>

      <BottomNav active="add" />
    </div>
  );
}
