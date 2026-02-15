import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Image, X } from "lucide-react";

export default function TradeCard({ trade, style }) {
  const [showImage, setShowImage] = useState(false);
  const isBuy = trade.trade_type === 'buy';
  const isWin = trade.outcome === 'win';
  const isLoss = trade.outcome === 'loss';
  const isOpen = trade.outcome === 'open';
  
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <>
      <div 
        className={`trade-card ${isBuy ? 'buy' : 'sell'} animate-slideUp`} 
        style={style}
        data-testid={`trade-card-${trade.trade_id}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Trade Direction Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isBuy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isBuy ? (
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            
            {/* Trade Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-lg tracking-wide" data-testid="trading-pair">
                  {trade.trading_pair}
                </span>
                <span className={`text-xs font-bold uppercase ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.trade_type}
                </span>
                {trade.screenshot_url && (
                  <button 
                    onClick={() => setShowImage(true)}
                    className="p-1 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    data-testid="view-screenshot-btn"
                  >
                    <Image className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatTime(trade.trade_date)} • {trade.lot_size} lots
              </p>
            </div>
          </div>
          
          {/* Outcome Badge */}
          <div className="text-right">
            {isOpen ? (
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800 px-2 py-1 rounded" data-testid="trade-status">
                OPEN
              </span>
            ) : (
              <>
                <span 
                  className={`text-xs font-semibold px-2 py-1 rounded ${isWin ? 'text-green-500 bg-green-500/20' : isLoss ? 'text-red-500 bg-red-500/20' : 'text-zinc-400 bg-zinc-800'}`}
                  data-testid="trade-status"
                >
                  {trade.outcome?.toUpperCase()}
                </span>
                {trade.pnl !== null && (
                  <p className={`font-mono text-sm mt-1 ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="trade-pnl">
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Screenshot Thumbnail */}
        {trade.screenshot_url && (
          <div 
            className="mt-3 cursor-pointer"
            onClick={() => setShowImage(true)}
          >
            <img 
              src={trade.screenshot_url} 
              alt="Trade screenshot" 
              className="w-full h-24 object-cover rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              data-testid="screenshot-thumbnail"
            />
          </div>
        )}
        
        {/* Price Details */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Entry</p>
            <p className="font-mono text-sm text-white" data-testid="entry-price">{trade.entry_price}</p>
          </div>
          {trade.stop_loss && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">SL</p>
              <p className="font-mono text-sm text-red-400">{trade.stop_loss}</p>
            </div>
          )}
          {trade.take_profit && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">TP</p>
              <p className="font-mono text-sm text-green-400">{trade.take_profit}</p>
            </div>
          )}
          {trade.close_price && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Close</p>
              <p className="font-mono text-sm text-white">{trade.close_price}</p>
            </div>
          )}
        </div>
        
        {/* Notes */}
        {trade.notes && (
          <p className="text-xs text-zinc-500 mt-3 italic" data-testid="trade-notes">
            "{trade.notes}"
          </p>
        )}
      </div>

      {/* Full Image Modal */}
      {showImage && trade.screenshot_url && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImage(false)}
          data-testid="screenshot-modal"
        >
          <button 
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setShowImage(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img 
            src={trade.screenshot_url} 
            alt="Trade screenshot" 
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
