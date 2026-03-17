/**
 * Monetization Context - Manages subscription and ad state across the app
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
  const [initAttempted, setInitAttempted] = useState(false);

  // Initialize monetization services
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'ios' || platform === 'android';
    setIsNative(native);

    if (!native) {
      console.log('Monetization: Web platform, skipping native init');
      setIsInitialized(true);
      return;
    }

    async function initialize() {
      if (initAttempted) return;
      setInitAttempted(true);
      
      console.log('Monetization: Starting initialization...');
      
      try {
        // Initialize RevenueCat
        const rcResult = await RevenueCatService.initializeRevenueCat(userId);
        console.log('Monetization: RevenueCat init result:', rcResult);

        if (rcResult.success) {
          // Get subscription status
          const status = await RevenueCatService.getSubscriptionStatus();
          console.log('Monetization: Subscription status:', status);
          setIsPremium(status.isPremium);

          // Get offerings with retry
          try {
            const offeringsData = await RevenueCatService.getOfferings();
            console.log('Monetization: Offerings loaded:', offeringsData?.hasOfferings);
            setOfferings(offeringsData);
          } catch (err) {
            console.warn('Monetization: Failed to load offerings (will retry on purchase):', err.message);
            // Don't fail initialization just because offerings didn't load
          }
        } else {
          console.warn('Monetization: RevenueCat init failed:', rcResult.error || rcResult.reason);
        }

        // Initialize AdMob
        try {
          const admobResult = await AdMobService.initializeAdMob();
          console.log('Monetization: AdMob init result:', admobResult);
        } catch (err) {
          console.warn('Monetization: AdMob init failed:', err.message);
        }

        setIsInitialized(true);
        console.log('Monetization: Initialization complete');
        
      } catch (err) {
        console.error('Monetization: Initialization error:', err);
        setError(err.message);
        setIsInitialized(true); // Still mark as initialized so app can proceed
      }
    }

    initialize();
  }, [userId, initAttempted]);

  // Show/hide banner based on premium status
  useEffect(() => {
    if (!isInitialized || !isNative) return;

    if (isPremium) {
      AdMobService.removeBanner();
    } else {
      AdMobService.showBanner();
    }

    return () => {
      AdMobService.hideBanner();
    };
  }, [isPremium, isInitialized, isNative]);

  // Purchase a subscription
  const purchase = useCallback(async (planType) => {
    if (!isNative) {
      return { success: false, error: 'Purchases only available on mobile app' };
    }

    console.log('Monetization: Starting purchase for:', planType);

    // Try to load offerings if not already loaded
    let currentOfferings = offerings;
    if (!currentOfferings || !currentOfferings.hasOfferings) {
      console.log('Monetization: Offerings not loaded, fetching now...');
      try {
        currentOfferings = await RevenueCatService.getOfferings();
        setOfferings(currentOfferings);
      } catch (err) {
        console.error('Monetization: Failed to fetch offerings:', err);
        return { success: false, error: 'Unable to load subscription options. Please try again.' };
      }
    }

    if (!currentOfferings || !currentOfferings.hasOfferings) {
      console.error('Monetization: No offerings available');
      return { success: false, error: 'No subscription options available. Please try again later.' };
    }

    try {
      // Find the right package
      let packageToPurchase = null;
      
      if (planType === 'yearly' || planType === 'annual') {
        packageToPurchase = currentOfferings.annual?.rawPackage;
      } else {
        packageToPurchase = currentOfferings.monthly?.rawPackage;
      }

      // Fallback: search in packages array
      if (!packageToPurchase && currentOfferings.packages) {
        packageToPurchase = currentOfferings.packages.find(p => 
          p.identifier?.toLowerCase().includes(planType) ||
          p.productId?.toLowerCase().includes(planType)
        )?.rawPackage;
      }

      if (!packageToPurchase) {
        console.error('Monetization: Package not found for:', planType);
        return { success: false, error: `${planType} plan not found. Please try again.` };
      }

      console.log('Monetization: Purchasing package:', packageToPurchase.identifier);
      const result = await RevenueCatService.purchasePackage(packageToPurchase);

      if (result.success) {
        setIsPremium(true);
        AdMobService.removeBanner();
      }

      return result;
      
    } catch (err) {
      console.error('Monetization: Purchase error:', err);
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
      console.error('Monetization: Restore error:', err);
      return { success: false, error: err.message };
    }
  }, [isNative]);

  // Show interstitial ad
  const showInterstitial = useCallback(async () => {
    if (!isNative || isPremium) return false;
    return AdMobService.showInterstitial();
  }, [isNative, isPremium]);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    if (!isNative) return;

    try {
      const status = await RevenueCatService.getSubscriptionStatus();
      setIsPremium(status.isPremium);
    } catch (err) {
      console.error('Monetization: Failed to refresh status:', err);
    }
  }, [isNative]);

  // Retry loading offerings
  const retryLoadOfferings = useCallback(async () => {
    if (!isNative) return null;
    
    try {
      const offeringsData = await RevenueCatService.getOfferings();
      setOfferings(offeringsData);
      return offeringsData;
    } catch (err) {
      console.error('Monetization: Failed to reload offerings:', err);
      return null;
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
    refreshStatus,
    retryLoadOfferings
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
