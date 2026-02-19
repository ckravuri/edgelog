import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, AlertCircle, CheckCircle, Crown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ImportPage() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('mt4');
  const [fileType, setFileType] = useState('html');
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const response = await fetch(`${API}/subscription/status`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.is_premium);
      }
    } catch (err) {
      console.error('Failed to check premium status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API}/import/mt4mt5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          file_content: fileContent,
          file_type: fileType,
          platform: platform
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Import failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 mb-6"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-4">
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Premium Feature</h1>
          <p className="text-zinc-400 mb-6">
            MT4/MT5 import is available for Premium users only
          </p>
          <button
            onClick={() => navigate('/premium')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" data-testid="import-page">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 mb-6"
        data-testid="back-button"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-2">Import Trades</h1>
      <p className="text-zinc-400 mb-6">Import your trade history from MT4 or MT5</p>

      {/* Platform Selection */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">Platform</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPlatform('mt4')}
            className={`p-3 rounded-lg border transition-all ${
              platform === 'mt4'
                ? 'border-green-500 bg-green-500/10'
                : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            MetaTrader 4
          </button>
          <button
            onClick={() => setPlatform('mt5')}
            className={`p-3 rounded-lg border transition-all ${
              platform === 'mt5'
                ? 'border-green-500 bg-green-500/10'
                : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            MetaTrader 5
          </button>
        </div>
      </div>

      {/* File Type Selection */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">File Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFileType('html')}
            className={`p-3 rounded-lg border transition-all ${
              fileType === 'html'
                ? 'border-green-500 bg-green-500/10'
                : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            HTML Report
          </button>
          <button
            onClick={() => setFileType('csv')}
            className={`p-3 rounded-lg border transition-all ${
              fileType === 'csv'
                ? 'border-green-500 bg-green-500/10'
                : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            CSV Export
          </button>
        </div>
      </div>

      {/* How to Export Guide */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <h3 className="font-medium mb-2">How to export from {platform.toUpperCase()}:</h3>
        <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
          {fileType === 'html' ? (
            <>
              <li>Open {platform.toUpperCase()} Terminal</li>
              <li>Go to Account History tab</li>
              <li>Right-click → Save as Detailed Report</li>
              <li>Save as HTML file</li>
            </>
          ) : (
            <>
              <li>Open {platform.toUpperCase()} Terminal</li>
              <li>Go to Account History tab</li>
              <li>Right-click → Export to CSV</li>
              <li>Save the CSV file</li>
            </>
          )}
        </ol>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Select File</label>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-green-500 transition-colors">
          <input
            type="file"
            accept={fileType === 'html' ? '.html,.htm' : '.csv'}
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileName ? (
            <div className="flex items-center gap-2 text-green-500">
              <FileText size={24} />
              <span>{fileName}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-zinc-500">
              <Upload size={32} className="mb-2" />
              <span>Click to select file</span>
              <span className="text-xs">({fileType.toUpperCase()} format)</span>
            </div>
          )}
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-green-400">
          <CheckCircle size={20} />
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!fileContent || loading}
        className="w-full py-4 bg-green-500 text-black font-bold rounded-xl transition-all hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="import-btn"
      >
        {loading ? 'Importing...' : 'Import Trades'}
      </button>

      {result && result.trades_imported > 0 && (
        <button
          onClick={() => navigate('/history')}
          className="w-full py-3 mt-3 border border-green-500 text-green-500 font-medium rounded-xl"
        >
          View Imported Trades
        </button>
      )}
    </div>
  );
}
