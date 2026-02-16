# EdgeLog - App Store Submission Guide

## App Information

| Field | Value |
|-------|-------|
| **App Name** | EdgeLog |
| **Bundle ID** | com.edgelog.app |
| **Version** | 1.2.0 |
| **Category** | Finance |
| **Developer** | EdgeLog |
| **Support Email** | ck.ravuri@gmail.com |
| **Privacy Policy URL** | https://[your-app-url]/privacy |

---

## Store Descriptions

### Short Description (80 chars)
```
Track, analyze & improve your trading performance with AI-powered insights
```

### Full Description
```
EdgeLog is your professional trading journal designed for serious traders who want to track, analyze, and improve their trading performance.

📊 TRACK YOUR TRADES
• Log trades with entry/exit prices, stop loss, take profit
• Add screenshots of your chart setups
• Record your emotions and notes for each trade
• Support for all markets: Forex, Stocks, Crypto, Commodities

📈 POWERFUL ANALYTICS
• Win/Loss tracking with win rate calculation
• Risk-Reward ratio analysis
• Equity curve visualization
• Daily P&L breakdown
• Discipline score to keep you accountable

🤖 AI-POWERED INSIGHTS
• Generate weekly & monthly performance reports
• Get personalized trading advice from AI
• Identify your best and worst performing pairs
• Share your results on social media

✨ KEY FEATURES
• Beautiful dark theme designed for traders
• Fast trade entry with common pairs preset
• Filter and search your trade history
• Cloud sync across devices
• Privacy-focused - your data is secure

🎯 DISCIPLINE TRACKING
• Set daily trade limits
• Track your discipline score
• Daily reminders to log your trades
• Build consistent trading habits

Perfect for:
• Forex traders
• Stock traders  
• Crypto traders
• Day traders
• Swing traders

Start journaling your trades today and discover patterns in your trading behavior. EdgeLog helps you become a more disciplined and profitable trader.

Download now and take your trading to the next level!
```

### Keywords (Apple App Store - 100 chars max)
```
trading,journal,forex,stocks,crypto,analytics,trader,log,performance,discipline
```

---

## Required Assets

### App Icon
- **Size**: 1024x1024 PNG (no transparency, no rounded corners)
- **Design**: EdgeLog logo with green trending arrow on dark background

### Screenshots Required

#### iPhone (6.5" - 1284 x 2778)
1. Home screen showing discipline score and today's trades
2. Add Trade screen with form
3. Dashboard with analytics charts
4. AI Report with social sharing
5. Trade History with filters

#### iPhone (5.5" - 1242 x 2208)
Same 5 screenshots, resized

#### iPad (12.9" - 2048 x 2732) - Optional
Same screens, tablet layout

#### Android Phone
1. 1080 x 1920 screenshots (same 5 screens)

### Feature Graphic (Google Play)
- **Size**: 1024 x 500 PNG
- **Design**: EdgeLog logo + tagline "Your Trading Edge, Journaled"

---

## Build Instructions

### Option 1: PWA to Native (Recommended - Fastest)

Use **Capacitor** to wrap the existing PWA:

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init EdgeLog com.edgelog.app

# Add platforms
npx cap add android
npx cap add ios

# Build web app
npm run build

# Sync to native projects
npx cap sync

# Open in Android Studio / Xcode
npx cap open android
npx cap open ios
```

### Option 2: Convert to Expo (More Control)

Convert the React app to React Native/Expo for full native experience.

---

## Google Play Store Submission

1. **Go to**: https://play.google.com/console
2. **Create App** → Enter details
3. **Store Listing**:
   - Add descriptions, screenshots, feature graphic
   - Set category to Finance
   - Add privacy policy URL
4. **Content Rating**: Complete questionnaire (likely "Everyone")
5. **Pricing**: Free
6. **Release**: 
   - Build AAB using Android Studio or EAS Build
   - Upload to Production track
   - Submit for review

### Google Play Review Time: 1-3 days

---

## Apple App Store Submission

1. **Go to**: https://appstoreconnect.apple.com
2. **My Apps** → + New App
3. **App Information**:
   - Name: EdgeLog
   - Bundle ID: com.edgelog.app
   - SKU: edgelog-001
4. **Pricing**: Free
5. **App Privacy**: 
   - Data types collected: Name, Email, User Content
   - Data linked to user: Yes
6. **Screenshots & Description**: Upload all assets
7. **Build**:
   - Archive from Xcode
   - Upload via Transporter or Xcode
8. **Submit for Review**

### Apple Review Time: 1-2 days (sometimes longer)

---

## Post-Launch Checklist

- [ ] Monitor crash reports (Firebase Crashlytics recommended)
- [ ] Respond to user reviews
- [ ] Track downloads and retention
- [ ] Plan update roadmap
- [ ] Set up analytics (Firebase, Mixpanel, or similar)

---

## Support

For any issues during submission, contact: ck.ravuri@gmail.com
