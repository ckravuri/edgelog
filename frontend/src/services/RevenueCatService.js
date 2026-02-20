/**
 * RevenueCat Service - Handles subscription management
 * 
 * API Keys:
 * - iOS: appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh
 * - Android: goog_CoRsfTgnHXZjUYvcNgXosmzVArw
 */

import { Capacitor } from '@capacitor/core';

// API Keys for RevenueCat
const REVENUECAT_API_KEY_IOS = 'appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh';
const REVENUECAT_API_KEY_ANDROID = 'goog_CoRsfTgnHXZjUYvcNgXosmzVArw';

let isInitialized = false;
let Purchases = null;

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup on native platforms
 */
export async function initializeRevenueCat(userId = null) {
  const platform = Capacitor.getPlatform();
  
  // Only initialize on native platforms
  if (platform !== 'ios' && platform !== 'android') {
    console.log('RevenueCat: Web platform detected, skipping initialization');
    return { success: false, reason: 'web_platform' };
  }
  
  if (isInitialized) {
    console.log('RevenueCat: Already initialized');
    return { success: true, reason: 'already_initialized' };
  }
  
  try {
    // Dynamically import RevenueCat
    const purchasesModule = await import('@revenuecat/purchases-capacitor');
    Purchases = purchasesModule.Purchases;
    const { LOG_LEVEL } = purchasesModule;
    
    // Set debug logging in development
    if (process.env.NODE_ENV === 'development') {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    
    // Get the appropriate API key for the platform
    const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    
    // Configure RevenueCat
    const configOptions = {
      apiKey: apiKey,
    };
    
    // Set app user ID if provided (for linking with backend user)
    if (userId) {
      configOptions.appUserID = userId;
    }
    
    await Purchases.configure(configOptions);
    isInitialized = true;
    
    console.log(`RevenueCat: Successfully initialized for ${platform}`);
    return { success: true, platform };
    
  } catch (error) {
    console.error('RevenueCat initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings() {
  if (!isInitialized || !Purchases) {
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current) {
      return { packages: [], hasOfferings: false };
    }
    
    // Map packages to a simpler format
    const packages = offerings.current.availablePackages.map(pkg => ({
      identifier: pkg.identifier,
      productId: pkg.product?.identifier || pkg.identifier,
      title: pkg.product?.title || pkg.identifier,
      description: pkg.product?.description || '',
      price: pkg.product?.priceString || '$0.00',
      priceAmount: pkg.product?.price || 0,
      periodType: pkg.packageType, // MONTHLY, ANNUAL, etc.
      rawPackage: pkg // Keep original for purchasing
    }));
    
    return {
      packages,
      hasOfferings: true,
      monthly: offerings.current.monthly,
      annual: offerings.current.annual,
      raw: offerings
    };
    
  } catch (error) {
    console.error('Failed to get offerings:', error);
    throw error;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(packageToPurchase) {
  if (!isInitialized || !Purchases) {
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    const result = await Purchases.purchasePackage({ 
      aPackage: packageToPurchase 
    });
    
    // Check if premium entitlement is now active
    const isPremium = result.customerInfo?.entitlements?.active?.['premium']?.isActive || false;
    
    return {
      success: true,
      isPremium,
      customerInfo: result.customerInfo
    };
    
  } catch (error) {
    // Check if user cancelled
    if (error.code === 'PURCHASE_CANCELLED_ERROR' || error.userCancelled) {
      return {
        success: false,
        cancelled: true,
        error: 'Purchase cancelled'
      };
    }
    
    console.error('Purchase error:', error);
    return {
      success: false,
      cancelled: false,
      error: error.message || 'Purchase failed'
    };
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus() {
  if (!isInitialized || !Purchases) {
    return {
      isPremium: false,
      isInitialized: false
    };
  }
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    const premiumEntitlement = customerInfo.entitlements?.active?.['premium'];
    
    return {
      isPremium: premiumEntitlement?.isActive || false,
      expirationDate: premiumEntitlement?.expirationDate 
        ? new Date(premiumEntitlement.expirationDate) 
        : null,
      willRenew: premiumEntitlement?.willRenew || false,
      productId: premiumEntitlement?.productIdentifier || null,
      isInitialized: true
    };
    
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return {
      isPremium: false,
      isInitialized: true,
      error: error.message
    };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases() {
  if (!isInitialized || !Purchases) {
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    const customerInfo = await Purchases.restorePurchases();
    
    const premiumEntitlement = customerInfo.entitlements?.active?.['premium'];
    const hasEntitlements = Object.keys(customerInfo.entitlements?.active || {}).length > 0;
    
    return {
      success: true,
      hasEntitlements,
      isPremium: premiumEntitlement?.isActive || false,
      customerInfo
    };
    
  } catch (error) {
    console.error('Restore purchases error:', error);
    return {
      success: false,
      error: error.message || 'Failed to restore purchases'
    };
  }
}

/**
 * Set the app user ID (for linking with your backend user)
 */
export async function setAppUserID(userId) {
  if (!isInitialized || !Purchases) {
    console.warn('RevenueCat not initialized, cannot set user ID');
    return false;
  }
  
  try {
    await Purchases.logIn({ appUserID: userId });
    return true;
  } catch (error) {
    console.error('Failed to set app user ID:', error);
    return false;
  }
}

/**
 * Check if RevenueCat is available (native platform)
 */
export function isRevenueCatAvailable() {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if initialized
 */
export function isRevenueCatInitialized() {
  return isInitialized;
}
