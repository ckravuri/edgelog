import { Platform } from 'react-native';

const CONFIG = {
  ios: { apiKey: 'appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh' },
  android: { apiKey: 'goog_CoRsfTgnHXZjUYvcNgXosmzVArw' },
  entitlementId: 'premium',
  products: {
    monthly: 'edgelog_premium_monthly',
    yearly: 'edgelog_premium_yearly',
  },
};

let Purchases = null;
let initialized = false;

export async function initRevenueCat(userId = null) {
  if (initialized) return true;
  try {
    Purchases = require('react-native-purchases').default;
    const apiKey = Platform.OS === 'ios' ? CONFIG.ios.apiKey : CONFIG.android.apiKey;

    if (userId) {
      Purchases.configure({ apiKey, appUserID: userId });
    } else {
      Purchases.configure({ apiKey });
    }
    initialized = true;
    console.log('[RC] Initialized for', Platform.OS);
    return true;
  } catch (e) {
    console.warn('[RC] Init failed:', e.message);
    return false;
  }
}

export async function getOfferings() {
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) return null;

    const pkgs = offerings.current.availablePackages || [];
    const monthly = pkgs.find(
      (p) => p.packageType === 'MONTHLY' || p.product?.identifier === CONFIG.products.monthly
    );
    const annual = pkgs.find(
      (p) => p.packageType === 'ANNUAL' || p.product?.identifier === CONFIG.products.yearly
    );

    return { monthly, annual, packages: pkgs };
  } catch (e) {
    console.warn('[RC] Offerings error:', e.message);
    return null;
  }
}

export async function purchasePackage(pkg) {
  if (!Purchases || !pkg) throw new Error('Not ready');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo?.entitlements?.active?.[CONFIG.entitlementId]?.isActive || false;
    return { success: true, isPremium };
  } catch (e) {
    if (e.userCancelled) return { success: false, cancelled: true };
    throw e;
  }
}

export async function checkSubscription() {
  if (!Purchases) return { isPremium: false };
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info?.entitlements?.active?.[CONFIG.entitlementId];
    return {
      isPremium: ent?.isActive || false,
      expirationDate: ent?.expirationDate ? new Date(ent.expirationDate) : null,
      willRenew: ent?.willRenew || false,
      productId: ent?.productIdentifier || null,
    };
  } catch (e) {
    return { isPremium: false, error: e.message };
  }
}

export async function restorePurchases() {
  if (!Purchases) throw new Error('Not initialized');
  try {
    const info = await Purchases.restorePurchases();
    const ent = info?.entitlements?.active?.[CONFIG.entitlementId];
    return { success: true, isPremium: ent?.isActive || false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
