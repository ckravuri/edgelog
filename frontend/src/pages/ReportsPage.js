import { authFetch } from "@/utils/authFetch";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Download, Share2, Twitter, Facebook, MessageCircle, Loader2, TrendingUp, TrendingDown, Target, Trophy, FileText, Crown } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ReportsPage({ user }) {
  const navigate = useNavigate();
  const reportCardRef = useRef(null);
  const [period, setPeriod] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    // Check premium status
    const checkPremium = async () => {
      try {
        const response = await authFetch('/subscription/status');
        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.is_premium);
        }
      } catch (err) {
        console.error('Failed to check premium:', err);
      }
    };
    checkPremium();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/reports/generate?period=${period}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate report');
      }
      
      const data = await response.json();
      setReport(data);
      toast.success('Report generated!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPdf = async () => {
    if (!report?.report_id) return;
    
    if (!isPremium) {
      toast.error('PDF download is a Premium feature. Upgrade to access!');
      navigate('/premium');
      return;
    }
    
    setDownloadingPdf(true);
    try {
      const response = await authFetch(`/export/report/${report.report_id}?format=pdf`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edgelog_report_${report.report_id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadAsImage = async () => {
    if (!reportCardRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportCardRef.current, {
        backgroundColor: '#050505',
        scale: 2,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `edgelog-report-${period}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Report downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const shareToSocial = (platform) => {
    const text = `My ${period} trading performance on EdgeLog:\n\n📊 ${report?.report_data?.total_trades || 0} trades\n✅ ${report?.report_data?.win_rate || 0}% win rate\n💰 P&L: ${(report?.report_data?.total_pnl || 0) >= 0 ? '+' : ''}${report?.report_data?.total_pnl || 0}\n\nTrack your trades with EdgeLog! 🚀`;
    
    const encodedText = encodeURIComponent(text);
    const url = encodeURIComponent(window.location.origin);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    const text = `My ${period} trading performance on EdgeLog:\n\n📊 ${report?.report_data?.total_trades || 0} trades\n✅ ${report?.report_data?.win_rate || 0}% win rate\n💰 P&L: ${(report?.report_data?.total_pnl || 0) >= 0 ? '+' : ''}${report?.report_data?.total_pnl || 0}\n\nTrack your trades with EdgeLog!`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="page-content" data-testid="reports-page">
      {/* Header */}
      <header className="app-header">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-heading text-xl font-bold tracking-wider uppercase">AI Reports</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-6 space-y-6">
        {/* Period Selection */}
        <div className="animate-fadeIn">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 block">
            Report Period
          </label>
          <div className="flex gap-3">
            {['weekly', 'monthly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 h-12 rounded text-sm font-semibold uppercase tracking-wider transition-all ${
                  period === p
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
                data-testid={`period-${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded font-heading text-lg font-bold uppercase tracking-wider text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
          data-testid="generate-report-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate AI Report
            </>
          )}
        </button>

        {/* Report Card */}
        {report && (
          <div className="space-y-4 animate-slideUp">
            {/* Shareable Card */}
            <div 
              ref={reportCardRef}
              className="stat-card p-6 space-y-5"
              data-testid="report-card"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <span className="font-heading text-xl font-bold tracking-wider">EDGELOG</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-3 py-1 rounded">
                  {period} Report
                </span>
              </div>

              {/* User & Date */}
              <div className="text-center py-2">
                <p className="text-lg font-semibold">{user?.name || 'Trader'}</p>
                <p className="text-xs text-zinc-500">{new Date(report.generated_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-3xl font-mono font-bold" data-testid="report-trades">
                    {report.report_data?.total_trades || 0}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Total Trades</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className={`text-3xl font-mono font-bold ${
                    (report.report_data?.win_rate || 0) >= 50 ? 'text-green-500' : 'text-red-500'
                  }`} data-testid="report-winrate">
                    {report.report_data?.win_rate || 0}%
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Win Rate</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className={`text-3xl font-mono font-bold ${
                    (report.report_data?.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} data-testid="report-pnl">
                    {(report.report_data?.total_pnl || 0) >= 0 ? '+' : ''}{report.report_data?.total_pnl || 0}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Total P&L</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-mono font-bold text-green-500">{report.report_data?.wins || 0}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-xl font-mono font-bold text-red-500">{report.report_data?.losses || 0}</span>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Wins / Losses</p>
                </div>
              </div>

              {/* Best/Worst Pair */}
              {(report.report_data?.best_pair || report.report_data?.worst_pair) && (
                <div className="flex gap-3">
                  {report.report_data?.best_pair && (
                    <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-500 uppercase tracking-wider">Best Pair</span>
                      </div>
                      <p className="font-mono font-bold">{report.report_data.best_pair.name}</p>
                      <p className="text-xs text-green-400">+{report.report_data.best_pair.pnl}</p>
                    </div>
                  )}
                  {report.report_data?.worst_pair && report.report_data.worst_pair.pnl < 0 && (
                    <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-500 uppercase tracking-wider">Needs Work</span>
                      </div>
                      <p className="font-mono font-bold">{report.report_data.worst_pair.name}</p>
                      <p className="text-xs text-red-400">{report.report_data.worst_pair.pnl}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Insights */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400">AI Insights</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed" data-testid="ai-insights">
                  {report.ai_insights}
                </p>
              </div>

              {/* Watermark */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-600">Generated by EdgeLog • edgelog.app</p>
              </div>
            </div>

            {/* Share Actions */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Share Report</p>
              
              {/* Social Buttons */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="h-12 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/30 rounded-lg flex items-center justify-center transition-all"
                  data-testid="share-twitter"
                >
                  <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                </button>
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="h-12 bg-[#4267B2]/20 hover:bg-[#4267B2]/30 border border-[#4267B2]/30 rounded-lg flex items-center justify-center transition-all"
                  data-testid="share-facebook"
                >
                  <Facebook className="w-5 h-5 text-[#4267B2]" />
                </button>
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="h-12 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 rounded-lg flex items-center justify-center transition-all"
                  data-testid="share-whatsapp"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all"
                  data-testid="copy-report"
                >
                  <Share2 className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadAsImage}
                  disabled={downloading}
                  className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  data-testid="download-image"
                >
                  {downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Image</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadAsPdf}
                  disabled={downloadingPdf}
                  className={`h-12 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    isPremium 
                      ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30' 
                      : 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30'
                  }`}
                  data-testid="download-pdf"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isPremium ? (
                        <FileText className="w-4 h-4 text-green-500" />
                      ) : (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className={`text-sm font-medium ${isPremium ? 'text-green-500' : 'text-yellow-500'}`}>
                        PDF {!isPremium && '(Premium)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Report State */}
        {!report && !loading && (
          <div className="text-center py-12 animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">AI Performance Reports</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Generate AI-powered insights from your trading data. Get actionable advice and share your progress!
            </p>
          </div>
        )}
      </div>

      <BottomNav active="dashboard" />
    </div>
  );
}
