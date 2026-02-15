import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, X, Camera, Image, Upload, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [form, setForm] = useState({
    trading_pair: '',
    trade_type: 'buy',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    lot_size: '0.01',
    trade_date: new Date().toISOString().slice(0, 16),
    notes: '',
    emotion_before: '',
    screenshot_url: ''
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target.result);
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setUploading(true);
    try {
      // Get signature from backend
      const sigResponse = await fetch(`${API}/cloudinary/signature?resource_type=image&folder=screenshots`, {
        credentials: 'include'
      });
      
      if (!sigResponse.ok) throw new Error('Failed to get upload signature');
      const sig = await sigResponse.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.api_key);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadResponse.ok) throw new Error('Upload failed');
      
      const result = await uploadResponse.json();
      handleChange('screenshot_url', result.secure_url);
      toast.success('Screenshot uploaded!');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload screenshot');
      setPreviewImage(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    handleChange('screenshot_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        trade_date: new Date(form.trade_date).toISOString(),
        screenshot_url: form.screenshot_url || null
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
        <div className="w-9" />
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

        {/* Screenshot Upload - NEW */}
        <div className="form-group animate-fadeIn" style={{ animationDelay: '0.22s' }}>
          <label className="form-label">Trade Screenshot</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            data-testid="screenshot-input"
          />
          
          {!previewImage ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-32 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-white/20 hover:bg-white/5 transition-all"
              data-testid="upload-screenshot-btn"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                  <span className="text-xs text-zinc-500">Uploading...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Tap to add chart screenshot</span>
                </>
              )}
            </button>
          ) : (
            <div className="relative">
              <img 
                src={previewImage} 
                alt="Trade screenshot" 
                className="w-full h-40 object-cover rounded-lg border border-white/10"
                data-testid="screenshot-preview"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                data-testid="remove-screenshot-btn"
              >
                <X className="w-4 h-4" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              )}
            </div>
          )}
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
          disabled={loading || uploading}
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
