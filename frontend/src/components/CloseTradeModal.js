import { authFetch } from "@/utils/authFetch";
import React, { useState } from "react";
import { X, TrendingUp, TrendingDown, Minus, Calculator } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CloseTradeModal({ trade, onClose, onTradeUpdated }) {
  const [outcome, setOutcome] = useState(null);
  const [closePrice, setClosePrice] = useState("");
  const [pnl, setPnl] = useState("");
  const [loading, setLoading] = useState(false);

  const isBuy = trade.trade_type === "buy";

  // Auto-calculate P&L when close price is entered
  const calculatePnl = (price) => {
    if (!price || !trade.entry_price) return;
    
    const entry = parseFloat(trade.entry_price);
    const close = parseFloat(price);
    const lots = parseFloat(trade.lot_size) || 0.01;
    
    // Simplified P&L calculation (pips * lot size * 10 for forex)
    let pips;
    if (isBuy) {
      pips = (close - entry) * 10000; // For forex pairs
    } else {
      pips = (entry - close) * 10000;
    }
    
    // For XAUUSD and other metals, adjust calculation
    if (trade.trading_pair?.includes("XAU") || trade.trading_pair?.includes("GOLD")) {
      pips = isBuy ? (close - entry) : (entry - close);
    }
    
    const calculatedPnl = (pips * lots * 10).toFixed(2);
    setPnl(calculatedPnl);
    
    // Auto-select outcome based on P&L
    if (parseFloat(calculatedPnl) > 0) {
      setOutcome("win");
    } else if (parseFloat(calculatedPnl) < 0) {
      setOutcome("loss");
    } else {
      setOutcome("breakeven");
    }
  };

  const handleClosePriceChange = (value) => {
    setClosePrice(value);
    calculatePnl(value);
  };

  const handleSubmit = async () => {
    if (!outcome) {
      toast.error("Please select an outcome");
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`/trades/${trade.trade_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          outcome,
          close_price: closePrice ? parseFloat(closePrice) : null,
          pnl: pnl ? parseFloat(pnl) : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update trade");

      toast.success("Trade closed successfully!");
      onTradeUpdated();
      onClose();
    } catch (error) {
      console.error("Error closing trade:", error);
      toast.error("Failed to close trade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="close-trade-modal">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0A0A0A] border-t border-white/10 rounded-t-2xl p-6 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-wider uppercase">Close Trade</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {trade.trading_pair} • {trade.trade_type.toUpperCase()} @ {trade.entry_price}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Outcome Selection */}
        <div className="mb-6">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">
            Trade Outcome
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setOutcome("win")}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                outcome === "win"
                  ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
                  : "bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20"
              }`}
              data-testid="outcome-win"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs font-bold uppercase">Win</span>
            </button>
            <button
              onClick={() => setOutcome("loss")}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                outcome === "loss"
                  ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                  : "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
              }`}
              data-testid="outcome-loss"
            >
              <TrendingDown className="w-5 h-5" />
              <span className="text-xs font-bold uppercase">Loss</span>
            </button>
            <button
              onClick={() => setOutcome("breakeven")}
              className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                outcome === "breakeven"
                  ? "bg-zinc-600 text-white shadow-lg shadow-zinc-500/30"
                  : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 hover:bg-zinc-500/20"
              }`}
              data-testid="outcome-breakeven"
            >
              <Minus className="w-5 h-5" />
              <span className="text-xs font-bold uppercase">B/E</span>
            </button>
          </div>
        </div>

        {/* Close Price & P&L */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
              Close Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={closePrice}
                onChange={(e) => handleClosePriceChange(e.target.value)}
                placeholder={trade.entry_price?.toString()}
                className="form-input font-mono"
                data-testid="close-price-input"
              />
              <button
                onClick={() => handleClosePriceChange(trade.take_profit || trade.entry_price)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 rounded hover:bg-white/10 transition-colors"
                title="Use Take Profit"
              >
                <Calculator className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
              P&L
            </label>
            <input
              type="number"
              step="any"
              value={pnl}
              onChange={(e) => setPnl(e.target.value)}
              placeholder="0.00"
              className={`form-input font-mono ${
                parseFloat(pnl) > 0 ? "text-green-500" : parseFloat(pnl) < 0 ? "text-red-500" : ""
              }`}
              data-testid="pnl-input"
            />
          </div>
        </div>

        {/* Quick P&L Buttons */}
        <div className="mb-6">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
            Quick P&L
          </label>
          <div className="flex gap-2 flex-wrap">
            {["-100", "-50", "-25", "+25", "+50", "+100", "+200"].map((val) => (
              <button
                key={val}
                onClick={() => {
                  setPnl(val.replace("+", ""));
                  setOutcome(val.startsWith("-") ? "loss" : "win");
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  val.startsWith("-")
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !outcome}
          className={`w-full h-14 rounded font-heading text-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            outcome === "win"
              ? "bg-green-600 hover:bg-green-500 text-white"
              : outcome === "loss"
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-white hover:bg-zinc-200 text-black"
          }`}
          data-testid="confirm-close-btn"
        >
          {loading ? "Saving..." : "Confirm & Close Trade"}
        </button>
      </div>
    </div>
  );
}
