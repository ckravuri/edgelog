/**
 * AdMob Service - Handles ad display for free users
 * 
 * This service manages banner and interstitial ads using Google AdMob
 * Ads are only shown to free-tier users
 * 
 * Ad Unit IDs provided by user:
 * iOS:
 *   - App ID: ca-app-pub-8958093663498636~7989527556
 *   - Banner: ca-app-pub-8958093663498636/8814497680
 *   - Interstitial: ca-app-pub-8958093663498636/3527163088
 * 
 * Android:
 *   - App ID: ca-app-pub-8958093663498636~5932109432
 *   - Banner: ca-app-pub-8958093663498636/6963785432
 *   - Interstitial: ca-app-pub-8958093663498636/8632018099
 */

import { Capacitor } from '@capacitor/core';

// AdMob Ad Unit IDs
const AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-8958093663498636/8814497680',
    interstitial: 'ca-app-pub-8958093663498636/3527163088'
  },
  android: {
    banner: 'ca-app-pub-8958093663498636/6963785432',
    interstitial: 'ca-app-pub-8958093663498636/8632018099'
  }
};

let AdMob = null;
let isInitialized = false;
let bannerVisible = false;
let interstitialLoaded = false;

/**
 * Initialize AdMob
 * Should be called once at app startup on native platforms
 */
export async function initializeAdMob() {
  const platform = Capacitor.getPlatform();
  
  // Only initialize on native platforms
  if (platform !== 'ios' && platform !== 'android') {
    console.log('AdMob: Web platform detected, skipping initialization');
    return { success: false, reason: 'web_platform' };
  }
  
  if (isInitialized) {
    console.log('AdMob: Already initialized');
    return { success: true, reason: 'already_initialized' };
  }
  
  try {
    // Dynamically import AdMob
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;
    
    // Initialize AdMob
    await AdMob.initialize({
      requestTrackingAuthorization: true, // Required for iOS 14+
      testingDevices: process.env.NODE_ENV === 'development' 
        ? ['2077ef9a63d2b398840261c8221a0c9b'] // Add test device IDs
        : [],
      initializeForTesting: process.env.NODE_ENV === 'development'
    });
    
    isInitialized = true;
    console.log(`AdMob: Successfully initialized for ${platform}`);
    
    // Pre-load interstitial
    await prepareInterstitial();
    
    return { success: true, platform };
    
  } catch (error) {
    console.error('AdMob initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Show banner ad at the bottom of the screen
 * Only call this for free users
 */
export async function showBanner() {
  if (!isInitialized || !AdMob) {
    console.log('AdMob: Not initialized, cannot show banner');
    return false;
  }
  
  if (bannerVisible) {
    console.log('AdMob: Banner already visible');
    return true;
  }
  
  const platform = Capacitor.getPlatform();
  const adUnitId = AD_UNITS[platform]?.banner;
  
  if (!adUnitId) {
    console.error('AdMob: No banner ad unit ID for platform:', platform);
    return false;
  }
  
  try {
    const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    
    await AdMob.showBanner({
      adId: adUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: process.env.NODE_ENV === 'development'
    });
    
    bannerVisible = true;
    console.log('AdMob: Banner shown');
    return true;
    
  } catch (error) {
    console.error('AdMob: Failed to show banner:', error);
    return false;
  }
}

/**
 * Hide the banner ad
 */
export async function hideBanner() {
  if (!isInitialized || !AdMob || !bannerVisible) {
    return false;
  }
  
  try {
    await AdMob.hideBanner();
    bannerVisible = false;
    console.log('AdMob: Banner hidden');
    return true;
  } catch (error) {
    console.error('AdMob: Failed to hide banner:', error);
    return false;
  }
}

/**
 * Remove the banner ad completely
 */
export async function removeBanner() {
  if (!isInitialized || !AdMob) {
    return false;
  }
  
  try {
    await AdMob.removeBanner();
    bannerVisible = false;
    console.log('AdMob: Banner removed');
    return true;
  } catch (error) {
    console.error('AdMob: Failed to remove banner:', error);
    return false;
  }
}

/**
 * Prepare interstitial ad (pre-load)
 */
export async function prepareInterstitial() {
  if (!isInitialized || !AdMob) {
    return false;
  }
  
  const platform = Capacitor.getPlatform();
  const adUnitId = AD_UNITS[platform]?.interstitial;
  
  if (!adUnitId) {
    console.error('AdMob: No interstitial ad unit ID for platform:', platform);
    return false;
  }
  
  try {
    await AdMob.prepareInterstitial({
      adId: adUnitId,
      isTesting: process.env.NODE_ENV === 'development'
    });
    
    interstitialLoaded = true;
    console.log('AdMob: Interstitial prepared');
    return true;
    
  } catch (error) {
    console.error('AdMob: Failed to prepare interstitial:', error);
    return false;
  }
}

/**
 * Show interstitial ad (full-screen)
 * Call this at natural transition points (e.g., after closing a trade, between pages)
 * Only for free users
 */
export async function showInterstitial() {
  if (!isInitialized || !AdMob) {
    console.log('AdMob: Not initialized, cannot show interstitial');
    return false;
  }
  
  try {
    // If not loaded, try to prepare first
    if (!interstitialLoaded) {
      await prepareInterstitial();
    }
    
    await AdMob.showInterstitial();
    interstitialLoaded = false;
    
    // Prepare the next interstitial
    setTimeout(() => prepareInterstitial(), 1000);
    
    console.log('AdMob: Interstitial shown');
    return true;
    
  } catch (error) {
    console.error('AdMob: Failed to show interstitial:', error);
    // Try to prepare for next time
    prepareInterstitial();
    return false;
  }
}

/**
 * Check if AdMob is available (native platform)
 */
export function isAdMobAvailable() {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if initialized
 */
export function isAdMobInitialized() {
  return isInitialized;
}

/**
 * Check if banner is currently visible
 */
export function isBannerVisible() {
  return bannerVisible;
}
