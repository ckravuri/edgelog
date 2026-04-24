import { Platform } from 'react-native';

const AD_IDS = {
  banner: {
    ios: 'ca-app-pub-8958093663498636/8814497680',
    android: 'ca-app-pub-8958093663498636/6963785432',
  },
  interstitial: {
    ios: 'ca-app-pub-8958093663498636/3527163088',
    android: 'ca-app-pub-8958093663498636/8632018099',
  },
};

export function getBannerAdId() {
  return Platform.OS === 'ios' ? AD_IDS.banner.ios : AD_IDS.banner.android;
}

export function getInterstitialAdId() {
  return Platform.OS === 'ios' ? AD_IDS.interstitial.ios : AD_IDS.interstitial.android;
}

let interstitialAd = null;
let isLoaded = false;

export async function loadInterstitial() {
  try {
    const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
    const adId = getInterstitialAdId();
    interstitialAd = InterstitialAd.createForAdRequest(adId);
    
    return new Promise((resolve) => {
      interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        isLoaded = true;
        resolve(true);
      });
      interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
        isLoaded = false;
        resolve(false);
      });
      interstitialAd.load();
    });
  } catch {
    return false;
  }
}

export async function showInterstitial() {
  if (isLoaded && interstitialAd) {
    interstitialAd.show();
    isLoaded = false;
    // Preload next
    setTimeout(loadInterstitial, 1000);
    return true;
  }
  return false;
}
