/**
 * RevenueCat Service - Handles subscription management
 * 
 * Configuration:
 * - iOS API Key: appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh
 * - Android API Key: goog_CoRsfTgnHXZjUYvcNgXosmzVArw
 * - Entitlement ID: premium
 * - Offering ID: default
 * - Products: edgelog_premium_monthly, edgelog_premium_yearly
 */

import { Capacitor } from '@capacitor/core';

// RevenueCat Configuration
const CONFIG = {
  ios: {
    apiKey: 'appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh'
  },
  android: {
    apiKey: 'goog_CoRsfTgnHXZjUYvcNgXosmzVArw'
  },
  entitlementId: 'premium',
  offeringId: 'default',
  products: {
    monthly: 'edgelog_premium_monthly',
    yearly: 'edgelog_premium_yearly'
  }
};

let isInitialized = false;
let Purchases = null;

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId = null) {
  const platform = Capacitor.getPlatform();
  
  if (platform !== 'ios' && platform !== 'android') {
    console.log('RevenueCat: Web platform, skipping');
    return { success: false, reason: 'web_platform' };
  }
  
  if (isInitialized) {
    console.log('RevenueCat: Already initialized');
    return { success: true, reason: 'already_initialized' };
  }
  
  try {
    const purchasesModule = await import('@revenuecat/purchases-capacitor');
    Purchases = purchasesModule.Purchases;
    const { LOG_LEVEL } = purchasesModule;
    
    // Enable debug logging
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    const apiKey = platform === 'ios' ? CONFIG.ios.apiKey : CONFIG.android.apiKey;
    
    const configOptions = { apiKey };
    if (userId) {
      configOptions.appUserID = userId;
    }
    
    await Purchases.configure(configOptions);
    isInitialized = true;
    
    console.log(`RevenueCat: Initialized for ${platform}`);
    return { success: true, platform };
    
  } catch (error) {
    console.error('RevenueCat init error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings() {
  if (!isInitialized || !Purchases) {
    console.error('RevenueCat: Not initialized');
    throw new Error('RevenueCat not initialized');
  }
  
  try {
    console.log('RevenueCat: Fetching offerings...');
    const offerings = await Purchases.getOfferings();
    console.log('RevenueCat: Raw offerings:', JSON.stringify(offerings, null, 2));
    
    // Check if we have any offerings
    if (!offerings || !offerings.current) {
      console.warn('RevenueCat: No current offering found');
      
      // Try to get by identifier
      if (offerings?.all && offerings.all[CONFIG.offeringId]) {
        const defaultOffering = offerings.all[CONFIG.offeringId];
        console.log('RevenueCat: Found offering by ID:', CONFIG.offeringId);
        return processOffering(defaultOffering, offerings);
      }
      
      return { packages: [], hasOfferings: false, raw: offerings };
    }
    
    return processOffering(offerings.current, offerings);
    
  } catch (error) {
    console.error('RevenueCat: Failed to get offerings:', error);
    throw error;
  }
}

/**
 * Process an offering into a standardized format
 */
function processOffering(offering, rawOfferings) {
  if (!offering) {
    return { packages: [], hasOfferings: false, raw: rawOfferings };
  }
  
  const availablePackages = offering.availablePackages || [];
  console.log('RevenueCat: Available packages:', availablePackages.length);
  
  // Map packages to simpler format
  const packages = availablePackages.map(pkg => {
    console.log('RevenueCat: Package:', pkg.identifier, pkg.product?.identifier);
    return {
      identifier: pkg.identifier,
      productId: pkg.product?.identifier || pkg.identifier,
      title: pkg.product?.title || pkg.identifier,
      description: pkg.product?.description || '',
      price: pkg.product?.priceString || '$0.00',
      priceAmount: pkg.product?.price || 0,
      periodType: pkg.packageType,
      rawPackage: pkg
    };
  });
  
  // Find monthly and yearly packages
  const monthly = availablePackages.find(p => 
    p.identifier === '$rc_monthly' || 
    p.packageType === 'MONTHLY' ||
    p.product?.identifier === CONFIG.products.monthly
  );
  
  const annual = availablePackages.find(p => 
    p.identifier === '$rc_annual' || 
    p.packageType === 'ANNUAL' ||
    p.product?.identifier === CONFIG.products.yearly
  );
  
  console.log('RevenueCat: Monthly package:', monthly?.identifier);
  console.log('RevenueCat: Annual package:', annual?.identifier);
  
  return {
    packages,
    hasOfferings: packages.length > 0,
    monthly: monthly ? { rawPackage: monthly, ...formatPackage(monthly) } : null,
    annual: annual ? { rawPackage: annual, ...formatPackage(annual) } : null,
    raw: rawOfferings
  };
}

/**
 * Format a package for display
 */
function formatPackage(pkg) {
  return {
    identifier: pkg.identifier,
    productId: pkg.product?.identifier,
    price: pkg.product?.priceString || '$0.00',
    priceAmount: pkg.product?.price || 0
  };
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(packageToPurchase) {
  if (!isInitialized || !Purchases) {
    throw new Error('RevenueCat not initialized');
  }
  
  console.log('RevenueCat: Attempting purchase:', packageToPurchase?.identifier);
  
  try {
    const result = await Purchases.purchasePackage({ 
      aPackage: packageToPurchase 
    });
    
    console.log('RevenueCat: Purchase result:', JSON.stringify(result, null, 2));
    
    // Check for premium entitlement
    const isPremium = result.customerInfo?.entitlements?.active?.[CONFIG.entitlementId]?.isActive || false;
    
    return {
      success: true,
      isPremium,
      customerInfo: result.customerInfo
    };
    
  } catch (error) {
    console.error('RevenueCat: Purchase error:', error);
    
    // Check if user cancelled
    if (error.code === 'PURCHASE_CANCELLED_ERROR' || 
        error.code === 1 || 
        error.userCancelled ||
        error.message?.includes('cancel')) {
      return {
        success: false,
        cancelled: true,
        error: 'Purchase cancelled'
      };
    }
    
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
    return { isPremium: false, isInitialized: false };
  }
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('RevenueCat: Customer info:', JSON.stringify(customerInfo, null, 2));
    
    const premiumEntitlement = customerInfo.customerInfo?.entitlements?.active?.[CONFIG.entitlementId] ||
                               customerInfo.entitlements?.active?.[CONFIG.entitlementId];
    
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
    console.error('RevenueCat: Failed to get status:', error);
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
    const result = await Purchases.restorePurchases();
    console.log('RevenueCat: Restore result:', JSON.stringify(result, null, 2));
    
    const customerInfo = result.customerInfo || result;
    const premiumEntitlement = customerInfo.entitlements?.active?.[CONFIG.entitlementId];
    const hasEntitlements = Object.keys(customerInfo.entitlements?.active || {}).length > 0;
    
    return {
      success: true,
      hasEntitlements,
      isPremium: premiumEntitlement?.isActive || false,
      customerInfo
    };
    
  } catch (error) {
    console.error('RevenueCat: Restore error:', error);
    return {
      success: false,
      error: error.message || 'Failed to restore purchases'
    };
  }
}

/**
 * Set the app user ID
 */
export async function setAppUserID(userId) {
  if (!isInitialized || !Purchases) {
    console.warn('RevenueCat: Not initialized');
    return false;
  }
  
  try {
    await Purchases.logIn({ appUserID: userId });
    return true;
  } catch (error) {
    console.error('RevenueCat: Failed to set user ID:', error);
    return false;
  }
}

/**
 * Check if RevenueCat is available
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

/**
 * Get config (for debugging)
 */
export function getConfig() {
  return CONFIG;
}
