import { authFetch } from "@/utils/authFetch";
import React, { useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const COMMON_PAIRS = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 
  'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'GBPJPY'
];

const EMOTIONS = ['Confident', 'Anxious', 'Neutral', 'FOMO', 'Revenge', 'Disciplined'];

export default function EditTradeModal({ trade, onClose, onTradeUpdated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    trading_pair: trade.trading_pair || '',
    trade_type: trade.trade_type || 'buy',
    entry_price: trade.entry_price?.toString() || '',
    stop_loss: trade.stop_loss?.toString() || '',
    take_profit: trade.take_profit?.toString() || '',
    lot_size: trade.lot_size?.toString() || '0.01',
    notes: trade.notes || '',
    emotion_before: trade.emotion_before || ''
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.trading_pair || !form.entry_price || !form.lot_size) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      // Note: We only update editable fields, not outcome/pnl
      const response = await authFetch(`/trades/${trade.trade_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notes: form.notes || null
        })
      });

      if (!response.ok) throw new Error('Failed to update trade');

      toast.success('Trade updated!');
      onTradeUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating trade:', error);
      toast.error('Failed to update trade');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    setLoading(true);
    try {
      const response = await authFetch(`/trades/${trade.trade_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete trade');

      toast.success('Trade deleted');
      onTradeUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast.error('Failed to delete trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="edit-trade-modal">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0A0A0A] border-t border-white/10 rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="font-heading text-xl font-bold tracking-wider uppercase">Edit Trade</h2>
          </div>
          <button 
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors"
            data-testid="delete-trade-btn"
          >
            Delete
          </button>
        </div>

        {/* Trade Info (Read-only) */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-heading font-bold text-lg">{form.trading_pair}</span>
            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
              form.trade_type === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
            }`}>
              {form.trade_type}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Entry</p>
              <p className="font-mono">{form.entry_price}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Lot Size</p>
              <p className="font-mono">{form.lot_size}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className={`font-mono ${
                trade.outcome === 'win' ? 'text-green-500' : 
                trade.outcome === 'loss' ? 'text-red-500' : 'text-zinc-400'
              }`}>
                {trade.outcome?.toUpperCase() || 'OPEN'}
              </p>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          {/* SL/TP (Display only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Stop Loss
              </label>
              <input
                type="text"
                value={form.stop_loss || 'Not set'}
                disabled
                className="form-input font-mono opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Take Profit
              </label>
              <input
                type="text"
                value={form.take_profit || 'Not set'}
                disabled
                className="form-input font-mono opacity-50"
              />
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
              Emotion Before Trade
            </label>
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
                >
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Trade setup, market conditions, thoughts..."
              rows={3}
              className="form-input h-auto py-3 resize-none"
              data-testid="edit-notes-input"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 mt-6 bg-white hover:bg-zinc-200 text-black rounded font-heading text-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          data-testid="save-edit-btn"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
