/**
 * Monetization Context - Manages subscription and ad state across the app
 * 
 * Provides:
 * - RevenueCat subscription status
 * - AdMob banner/interstitial control
 * - Purchase flow helpers
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import * as RevenueCatService from '@/services/RevenueCatService';
import * as AdMobService from '@/services/AdMobService';

const MonetizationContext = createContext(null);

export function MonetizationProvider({ children, userId }) {
  const [isNative, setIsNative] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [error, setError] = useState(null);

  // Initialize monetization services on native platforms
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'ios' || platform === 'android';
    setIsNative(native);

    if (!native) {
      setIsInitialized(true);
      return;
    }

    async function initialize() {
      try {
        // Initialize RevenueCat
        const rcResult = await RevenueCatService.initializeRevenueCat(userId);
        console.log('RevenueCat init result:', rcResult);

        if (rcResult.success) {
          // Get subscription status
          const status = await RevenueCatService.getSubscriptionStatus();
          setIsPremium(status.isPremium);

          // Get offerings
          try {
            const offeringsData = await RevenueCatService.getOfferings();
            setOfferings(offeringsData);
          } catch (err) {
            console.warn('Failed to load offerings:', err);
          }
        }

        // Initialize AdMob (for showing ads to free users)
        const admobResult = await AdMobService.initializeAdMob();
        console.log('AdMob init result:', admobResult);

        setIsInitialized(true);
      } catch (err) {
        console.error('Monetization initialization error:', err);
        setError(err.message);
        setIsInitialized(true);
      }
    }

    initialize();
  }, [userId]);

  // Show/hide banner based on premium status
  useEffect(() => {
    if (!isInitialized || !isNative) return;

    if (isPremium) {
      // Premium user - hide ads
      AdMobService.removeBanner();
    } else {
      // Free user - show banner
      AdMobService.showBanner();
    }

    return () => {
      // Cleanup banner on unmount
      AdMobService.hideBanner();
    };
  }, [isPremium, isInitialized, isNative]);

  // Purchase a subscription
  const purchase = useCallback(async (planType) => {
    if (!isNative) {
      return { success: false, error: 'Purchases only available on mobile app' };
    }

    if (!offerings) {
      return { success: false, error: 'Offerings not loaded' };
    }

    try {
      const packageToPurchase = planType === 'yearly' 
        ? offerings.annual?.rawPackage || offerings.raw?.current?.annual
        : offerings.monthly?.rawPackage || offerings.raw?.current?.monthly;

      if (!packageToPurchase) {
        // Fallback to first available package
        const allPackages = offerings.packages || offerings.raw?.current?.availablePackages || [];
        const fallbackPackage = allPackages.find(p => 
          p.identifier?.toLowerCase().includes(planType) || 
          p.productId?.toLowerCase().includes(planType)
        ) || allPackages[0];

        if (!fallbackPackage) {
          return { success: false, error: 'No subscription packages available' };
        }

        const result = await RevenueCatService.purchasePackage(
          fallbackPackage.rawPackage || fallbackPackage
        );

        if (result.success) {
          setIsPremium(true);
          AdMobService.removeBanner();
        }

        return result;
      }

      const result = await RevenueCatService.purchasePackage(packageToPurchase);

      if (result.success) {
        setIsPremium(true);
        AdMobService.removeBanner();
      }

      return result;
    } catch (err) {
      console.error('Purchase error:', err);
      return { success: false, error: err.message };
    }
  }, [isNative, offerings]);

  // Restore purchases
  const restore = useCallback(async () => {
    if (!isNative) {
      return { success: false, error: 'Restore only available on mobile app' };
    }

    try {
      const result = await RevenueCatService.restorePurchases();

      if (result.isPremium) {
        setIsPremium(true);
        AdMobService.removeBanner();
      }

      return result;
    } catch (err) {
      console.error('Restore error:', err);
      return { success: false, error: err.message };
    }
  }, [isNative]);

  // Show interstitial ad (for free users at natural break points)
  const showInterstitial = useCallback(async () => {
    if (!isNative || isPremium) {
      return false;
    }
    return AdMobService.showInterstitial();
  }, [isNative, isPremium]);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    if (!isNative) return;

    try {
      const status = await RevenueCatService.getSubscriptionStatus();
      setIsPremium(status.isPremium);
    } catch (err) {
      console.error('Failed to refresh status:', err);
    }
  }, [isNative]);

  const value = {
    isNative,
    isPremium,
    isInitialized,
    offerings,
    error,
    purchase,
    restore,
    showInterstitial,
    refreshStatus
  };

  return (
    <MonetizationContext.Provider value={value}>
      {children}
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  const context = useContext(MonetizationContext);
  if (!context) {
    throw new Error('useMonetization must be used within a MonetizationProvider');
  }
  return context;
}

export default MonetizationContext;
