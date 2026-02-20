# EdgeLog Monetization Integration Guide

This guide covers the AdMob and RevenueCat integrations added to EdgeLog.

## What's Been Implemented

### 1. RevenueCat (Subscription Management)
- **Frontend Service:** `/frontend/src/services/RevenueCatService.js`
- **Context Provider:** `/frontend/src/context/MonetizationContext.js`
- **Premium Page:** Updated to use the new monetization context

**API Keys Configured:**
- iOS: `appl_fkQLSsiDoBAFKVrZuCAWNWUuhVh`
- Android: `goog_CoRsfTgnHXZjUYvcNgXosmzVArw`

**Features:**
- Initialize RevenueCat on app start (native platforms only)
- Fetch subscription offerings
- Purchase subscriptions (monthly/yearly)
- Restore previous purchases
- Check subscription status

### 2. AdMob (Advertising)
- **Frontend Service:** `/frontend/src/services/AdMobService.js`
- **Integrated into:** `MonetizationContext.js`

**Ad Unit IDs Configured:**

| Platform | Type | Ad Unit ID |
|----------|------|------------|
| iOS | App ID | `ca-app-pub-8958093663498636~7989527556` |
| iOS | Banner | `ca-app-pub-8958093663498636/8814497680` |
| iOS | Interstitial | `ca-app-pub-8958093663498636/3527163088` |
| Android | App ID | `ca-app-pub-8958093663498636~5932109432` |
| Android | Banner | `ca-app-pub-8958093663498636/6963785432` |
| Android | Interstitial | `ca-app-pub-8958093663498636/8632018099` |

**Features:**
- Banner ads at bottom of screen (for free users)
- Interstitial ads at natural break points
- Ads automatically hidden for premium users

## Native Configuration Changes

### Android (`android/app/src/main/AndroidManifest.xml`)
Added:
```xml
<!-- AdMob App ID -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-8958093663498636~5932109432"/>

<!-- Billing Permission for In-App Purchases -->
<uses-permission android:name="com.android.vending.BILLING" />
```

### iOS (`ios/App/App/Info.plist`)
Added:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-8958093663498636~7989527556</string>
<key>SKAdNetworkItems</key>
<array>
    <dict>
        <key>SKAdNetworkIdentifier</key>
        <string>cstr6suwn9.skadnetwork</string>
    </dict>
</array>
<key>NSUserTrackingUsageDescription</key>
<string>This identifier will be used to deliver personalized ads to you.</string>
```

## RevenueCat Setup Required in Dashboard

Before the subscriptions work, you need to configure products in RevenueCat:

### 1. Create Products in App Store Connect / Google Play Console

**iOS (App Store Connect):**
1. Go to App Store Connect → Your App → In-App Purchases
2. Create two products:
   - `edgelog_premium_monthly` - Auto-renewable subscription, $5.99/month
   - `edgelog_premium_yearly` - Auto-renewable subscription, $49.99/year

**Android (Google Play Console):**
1. Go to Play Console → Your App → Monetize → Products → Subscriptions
2. Create two subscriptions:
   - `edgelog_premium_monthly` - $5.99/month
   - `edgelog_premium_yearly` - $49.99/year

### 2. Configure Products in RevenueCat

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Go to your EdgeLog project
3. Navigate to **Products** and add your products from both stores
4. Create an **Entitlement** called `premium`
5. Create an **Offering** called `default` with:
   - Monthly package: `edgelog_premium_monthly`
   - Annual package: `edgelog_premium_yearly`

### 3. Configure Webhook (For Backend Sync)

1. In RevenueCat → Project Settings → Integrations → Webhooks
2. Add webhook URL: `https://your-backend-url/api/subscription/webhook`
3. Set Authorization header for security

## Rebuilding the Native Apps

### iOS
```bash
cd frontend
yarn build
npx cap sync ios
```

Then open Xcode (`ios/App/App.xcworkspace`) and:
1. Set Team/Signing
2. Verify Bundle ID is `com.ravuri.edgelog`
3. Enable "In-App Purchase" capability
4. Enable "Sign in with Apple" capability
5. Archive and submit

### Android
```bash
cd frontend
yarn build
npx cap sync android
```

Then open Android Studio (`android/` folder) and:
1. Build → Generate Signed Bundle
2. Upload to Play Console

## Testing

### On Web (Preview Mode)
- Ads and purchases are disabled on web
- Users see a message to download the mobile app

### On Native Device
- Test with sandbox accounts (iOS TestFlight, Android Internal Testing)
- Use RevenueCat's "Test Store" API key for development testing

## How It Works

1. **App Start:** MonetizationContext initializes RevenueCat and AdMob
2. **Free User:** Banner ad shown at bottom, interstitials at transitions
3. **Premium Page:** User can view offerings and purchase
4. **After Purchase:** RevenueCat confirms, ads are removed
5. **Backend Sync:** RevenueCat webhook updates user's premium status in MongoDB
6. **Restore:** Users can restore purchases on new devices

## Files Changed/Created

**New Files:**
- `frontend/src/services/RevenueCatService.js` - RevenueCat SDK wrapper
- `frontend/src/services/AdMobService.js` - AdMob SDK wrapper
- `frontend/src/context/MonetizationContext.js` - React context for monetization

**Modified Files:**
- `frontend/src/App.js` - Added MonetizationProvider
- `frontend/src/pages/PremiumPage.js` - Using new monetization context
- `android/app/src/main/AndroidManifest.xml` - AdMob App ID, BILLING permission
- `ios/App/App/Info.plist` - AdMob App ID, tracking description

## Important Notes

⚠️ **Remember:** `npx cap sync ios` may reset Xcode settings. After every sync:
1. Re-check signing/team settings
2. Re-enable capabilities (In-App Purchase, Sign in with Apple)
3. Re-configure app icon if needed
