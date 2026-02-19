# Google AdMob Setup Guide for EdgeLog

## Step 1: Create AdMob Account

1. Go to **[admob.google.com](https://admob.google.com)**
2. Sign in with your Google account
3. Click **"Get Started"**
4. Accept the terms and conditions
5. Complete the account setup (country, timezone, payment info)

---

## Step 2: Create Your Apps in AdMob

### For Android:
1. Click **"Apps"** in sidebar → **"Add App"**
2. Select **"Android"**
3. **"Is the app listed on Google Play?"** → Select **"No"** (for now)
4. App name: **EdgeLog**
5. Click **"Add App"**
6. **Save the App ID** (looks like: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)

### For iOS:
1. Click **"Apps"** → **"Add App"**
2. Select **"iOS"**
3. **"Is the app listed on App Store?"** → Select **"No"** (for now)
4. App name: **EdgeLog**
5. Click **"Add App"**
6. **Save the App ID**

---

## Step 3: Create Ad Units

### For EACH app (Android & iOS), create these ad units:

### Banner Ad:
1. Click on your app → **"Ad units"** → **"Add ad unit"**
2. Select **"Banner"**
3. Name: **"EdgeLog Banner"**
4. Click **"Create ad unit"**
5. **Save the Ad Unit ID** (looks like: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

### Interstitial Ad:
1. **"Add ad unit"** → Select **"Interstitial"**
2. Name: **"EdgeLog Interstitial"**
3. Click **"Create ad unit"**
4. **Save the Ad Unit ID**

---

## Step 4: Get Your IDs Ready

After setup, you'll have these IDs (example format):

```
# Android
ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# iOS
ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

---

## Step 5: Share IDs with Developer

Once you have all 6 IDs (3 for Android, 3 for iOS), share them so I can integrate into the app.

---

## Test Ad IDs (For Development)

While waiting for approval, we can use Google's test IDs:

```
# Android Test IDs
Banner: ca-app-pub-3940256099942544/6300978111
Interstitial: ca-app-pub-3940256099942544/1033173712

# iOS Test IDs  
Banner: ca-app-pub-3940256099942544/2934735716
Interstitial: ca-app-pub-3940256099942544/4411468910
```

These show test ads and won't generate revenue but let us test the integration.
