import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, X, Zap, Shield, Download, Brain, ChevronLeft, Tag } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function PremiumPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch(`${API}/subscription/status`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponLoading(true);
    setError(null);
    
    try {
      // First validate
      const validateResponse = await fetch(`${API}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() })
      });
      
      const validateData = await validateResponse.json();
      
      if (!validateResponse.ok) {
        throw new Error(validateData.detail || 'Invalid coupon');
      }
      
      // Then apply
      const applyResponse = await fetch(`${API}/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() })
      });
      
      const applyData = await applyResponse.json();
      
      if (!applyResponse.ok) {
        throw new Error(applyData.detail || 'Failed to apply coupon');
      }
      
      setAppliedCoupon(applyData);
      toast.success(applyData.message);
      
      // Refresh subscription status if free days were given
      if (applyData.discount_type === 'free_days') {
        await fetchSubscriptionStatus();
      }
      
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if running on native platform
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios' || platform === 'android') {
        // Use RevenueCat for native purchases
        // This will be implemented with RevenueCat SDK
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
        // Get offerings
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current) {
          const packageToPurchase = selectedPlan === 'yearly' 
            ? offerings.current.annual 
            : offerings.current.monthly;
          
          if (packageToPurchase) {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
            
            if (customerInfo.entitlements.active['premium']) {
              // Refresh subscription status
              await fetchSubscriptionStatus();
              navigate('/settings');
            }
          }
        }
      } else {
        // Web - redirect to app stores
        setError('Please download the mobile app to subscribe.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      if (err.code !== 'PURCHASE_CANCELLED_ERROR') {
        setError('Failed to complete purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios' || platform === 'android') {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { customerInfo } = await Purchases.restorePurchases();
        
        if (customerInfo.entitlements.active['premium']) {
          toast.success('Purchases restored successfully!');
          await fetchSubscriptionStatus();
        } else {
          toast.info('No previous purchases found.');
        }
      } else {
        setError('Restore purchases is only available on mobile devices.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      setError('Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: X, text: 'No Ads', free: false, premium: true },
    { icon: Brain, text: 'Unlimited AI Reports', free: '1/week', premium: true },
    { icon: Shield, text: 'Unlimited Trade History', free: '14 days', premium: true },
    { icon: Download, text: 'MT4/MT5 Import', free: false, premium: true },
    { icon: Download, text: 'Export to Excel/PDF', free: false, premium: true },
    { icon: Zap, text: 'Share via WhatsApp/Email', free: false, premium: true },
  ];

  // Show premium status if already premium
  if (subscriptionStatus?.is_premium) {
    const isTrial = subscriptionStatus.is_trial;
    const daysLeft = subscriptionStatus.trial_days_left;
    
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
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            isTrial ? 'bg-yellow-500/20' : 'bg-green-500/20'
          }`}>
            <Crown className={`w-10 h-10 ${isTrial ? 'text-yellow-500' : 'text-green-500'}`} />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isTrial ? 'Free Trial Active!' : "You're Premium!"}
          </h1>
          <p className="text-zinc-400 mb-4">
            {isTrial 
              ? `You have ${daysLeft} days left in your free trial`
              : 'Enjoy all premium features'}
          </p>
          <p className="text-sm text-zinc-500">
            {isTrial ? 'Trial expires: ' : 'Subscription expires: '}
            {subscriptionStatus.expires_at 
              ? new Date(subscriptionStatus.expires_at).toLocaleDateString() 
              : 'Never'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" data-testid="premium-page">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 mb-6"
        data-testid="back-button"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
          <Crown className="w-8 h-8 text-black" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Upgrade to Premium</h1>
        <p className="text-zinc-400">Unlock your full trading potential</p>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setSelectedPlan('monthly')}
          className={`p-4 rounded-xl border-2 transition-all ${
            selectedPlan === 'monthly'
              ? 'border-green-500 bg-green-500/10'
              : 'border-zinc-800 bg-zinc-900'
          }`}
          data-testid="monthly-plan-btn"
        >
          <div className="text-sm text-zinc-400 mb-1">Monthly</div>
          <div className="text-xl font-bold">$5.99</div>
          <div className="text-xs text-zinc-500">/month</div>
        </button>
        
        <button
          onClick={() => setSelectedPlan('yearly')}
          className={`p-4 rounded-xl border-2 transition-all relative ${
            selectedPlan === 'yearly'
              ? 'border-green-500 bg-green-500/10'
              : 'border-zinc-800 bg-zinc-900'
          }`}
          data-testid="yearly-plan-btn"
        >
          <div className="absolute -top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            SAVE 30%
          </div>
          <div className="text-sm text-zinc-400 mb-1">Yearly</div>
          <div className="text-xl font-bold">$49.99</div>
          <div className="text-xs text-zinc-500">/year</div>
        </button>
      </div>

      {/* Features Comparison */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <h3 className="font-semibold mb-4">What you get:</h3>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <feature.icon size={18} className="text-green-500" />
                <span className="text-sm">{feature.text}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-500 w-16 text-center">
                  {feature.free === false ? (
                    <X size={16} className="text-red-500 mx-auto" />
                  ) : feature.free === true ? (
                    <Check size={16} className="text-green-500 mx-auto" />
                  ) : (
                    feature.free
                  )}
                </span>
                <span className="text-xs w-16 text-center">
                  <Check size={16} className="text-green-500 mx-auto" />
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-4 mt-2 text-xs text-zinc-500">
          <span className="w-16 text-center">Free</span>
          <span className="w-16 text-center text-green-500 font-medium">Premium</span>
        </div>
      </div>

      {/* Coupon Code */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500"
              data-testid="coupon-input"
            />
          </div>
          <button
            onClick={handleApplyCoupon}
            disabled={couponLoading || !couponCode.trim()}
            className="px-4 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="apply-coupon-btn"
          >
            {couponLoading ? '...' : 'Apply'}
          </button>
        </div>
        {appliedCoupon && (
          <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
            <Check size={16} />
            <span>{appliedCoupon.message}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Subscribe Button */}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
        data-testid="subscribe-btn"
      >
        {loading ? 'Processing...' : `Subscribe for $${selectedPlan === 'yearly' ? '49.99/year' : '5.99/month'}${appliedCoupon?.discount_type === 'percentage' ? ` (${appliedCoupon.discount_value}% off)` : ''}`}
      </button>

      <p className="text-xs text-zinc-500 text-center mt-4">
        Cancel anytime. Subscription renews automatically.
      </p>
    </div>
  );
}
