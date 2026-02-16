# 🍎 EdgeLog - Apple App Store Deployment Guide

## What You'll Download

From the Emergent platform, you'll download a ZIP file containing:
```
edgelog-ios/
├── ios/                    # Xcode project (open this in Xcode)
│   ├── App/
│   │   ├── App.xcodeproj   # <-- Open this file in Xcode
│   │   └── App/
│   │       └── public/     # Your web app files
│   └── Podfile
├── public/
│   └── app-icons/          # All icon sizes for iOS
│       ├── icon-1024.png   # App Store icon
│       ├── icon-180.png    # iPhone icon
│       ├── icon-167.png    # iPad Pro icon
│       └── ... more sizes
└── capacitor.config.json
```

---

## Step-by-Step Deployment Instructions

### STEP 1: Download the Project

1. In Emergent, click **"Download Code"** button (or similar export option)
2. Extract the ZIP file to a folder on your Mac (e.g., Desktop/EdgeLog)

---

### STEP 2: Open in Xcode

1. Open **Xcode** on your Mac
2. Click **File → Open**
3. Navigate to: `EdgeLog/ios/App/App.xcodeproj`
4. Click **Open**

---

### STEP 3: Configure Signing & Team

1. In Xcode, click on **"App"** in the left sidebar (the blue app icon)
2. Click **"Signing & Capabilities"** tab
3. Check **"Automatically manage signing"**
4. Select your **Team**: Should show your Apple Developer account
5. **Bundle Identifier**: Verify it says `com.edgelog.app`

If you see errors:
- Make sure you're signed into Xcode with your Apple Developer account
- Go to **Xcode → Settings → Accounts** and add your Apple ID

---

### STEP 4: Add App Icons

1. In Xcode left sidebar, expand **App → App → Assets**
2. Click on **AppIcon**
3. Open Finder and navigate to `EdgeLog/public/app-icons/`
4. Drag and drop icons to matching slots:

| Slot | File to Use |
|------|-------------|
| iPhone App iOS 180pt | icon-180.png |
| iPhone App iOS 120pt | icon-120.png |
| iPad App iOS 167pt | icon-167.png |
| iPad App iOS 152pt | icon-152.png |
| App Store iOS 1024pt | icon-1024.png |

---

### STEP 5: Set App Version

1. Click on **"App"** in the left sidebar
2. Click **"General"** tab
3. Set:
   - **Display Name**: EdgeLog
   - **Bundle Identifier**: com.edgelog.app
   - **Version**: 1.2.0
   - **Build**: 1

---

### STEP 6: Test on Simulator (Optional but Recommended)

1. In Xcode top bar, select a simulator (e.g., "iPhone 15 Pro")
2. Click the **▶ Play** button
3. App should launch in simulator
4. Test login, add trade, dashboard, etc.

---

### STEP 7: Archive for App Store

1. In Xcode top bar, select **"Any iOS Device (arm64)"** as the target
2. Click **Product → Archive**
3. Wait for build to complete (2-5 minutes)
4. **Organizer** window will open automatically

---

### STEP 8: Upload to App Store Connect

1. In Organizer, select your archive
2. Click **"Distribute App"**
3. Select **"App Store Connect"** → Click **Next**
4. Select **"Upload"** → Click **Next**
5. Keep defaults, click **Next**
6. Review and click **"Upload"**
7. Wait for upload to complete

---

### STEP 9: Complete App Store Connect Setup

1. Go to: **https://appstoreconnect.apple.com**
2. Sign in with your Apple Developer account
3. Click **"My Apps"** → **"+"** → **"New App"**
4. Fill in:
   - **Platform**: iOS
   - **Name**: EdgeLog
   - **Primary Language**: English
   - **Bundle ID**: com.edgelog.app (select from dropdown)
   - **SKU**: edgelog-001
   - **User Access**: Full Access

5. Click **"Create"**

---

### STEP 10: Fill App Information

#### App Information Tab:
- **Category**: Finance
- **Content Rights**: Does not contain third-party content

#### Pricing and Availability:
- **Price**: Free

#### App Privacy:
Click **"Get Started"** and answer:
- **Data Types Collected**:
  - ✅ Contact Info (Name, Email)
  - ✅ User Content (Photos, Trading data)
- **Data Linked to User**: Yes
- **Data Used for Tracking**: No

**Privacy Policy URL**: 
```
https://create-anything-39.preview.emergentagent.com/privacy
```
(Replace with your production URL after deployment)

---

### STEP 11: Add Screenshots

You need screenshots for:
- **6.7" Display** (iPhone 15 Pro Max): 1290 x 2796 px
- **6.5" Display** (iPhone 11 Pro Max): 1284 x 2778 px
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 px

**Take screenshots from Simulator:**
1. Run app in Xcode Simulator
2. Press **Cmd + S** to save screenshot
3. Upload to App Store Connect

**Required Screenshots (5-10 per device):**
1. Login screen
2. Home screen with trades
3. Add Trade form
4. Dashboard analytics
5. AI Report with sharing

---

### STEP 12: Write Description

**App Name**: EdgeLog

**Subtitle** (30 chars):
```
Trading Journal & Analytics
```

**Promotional Text** (170 chars):
```
Track your trades, analyze performance, and get AI-powered insights. The smart trading journal for serious traders.
```

**Description** (copy from APP_STORE_GUIDE.md):
```
EdgeLog is your professional trading journal designed for serious traders who want to track, analyze, and improve their trading performance.

📊 TRACK YOUR TRADES
• Log trades with entry/exit prices, stop loss, take profit
• Add screenshots of your chart setups
• Record your emotions and notes for each trade

📈 POWERFUL ANALYTICS
• Win/Loss tracking with win rate calculation
• Equity curve visualization
• Daily P&L breakdown
• Discipline score tracking

🤖 AI-POWERED INSIGHTS
• Generate weekly & monthly performance reports
• Get personalized trading advice
• Share results on social media

Download now and take your trading to the next level!
```

**Keywords** (100 chars max):
```
trading,journal,forex,stocks,crypto,analytics,trader,performance,discipline
```

**Support URL**: 
```
mailto:ck.ravuri@gmail.com
```

---

### STEP 13: Select Build & Submit

1. Scroll to **"Build"** section
2. Click **"+"** to select your uploaded build
3. Choose the build you uploaded in Step 8
4. Fill in **"What's New in This Version"**:
```
Initial release of EdgeLog - Your professional trading journal.
```
5. Click **"Save"**
6. Click **"Submit for Review"**

---

### STEP 14: Wait for Review

- Apple typically reviews within **24-48 hours**
- You'll receive email notifications
- Check App Store Connect for status updates

**Possible Outcomes:**
- ✅ **Approved** - App goes live!
- ⚠️ **Rejected** - Read feedback, fix issues, resubmit

---

## Common Issues & Solutions

### "No signing certificate"
→ Go to Xcode → Settings → Accounts → Manage Certificates → Add (+)

### "Bundle ID already exists"
→ Use a different bundle ID like `com.edgelog.journal`

### "Missing icons"
→ Make sure all icon slots are filled in Assets.xcassets

### "App rejected for privacy"
→ Add NSCameraUsageDescription and NSPhotoLibraryUsageDescription to Info.plist

---

## Need Help?

Contact: ck.ravuri@gmail.com

---

## Timeline Summary

| Step | Time |
|------|------|
| Download & Setup | 15 min |
| Configure Xcode | 10 min |
| Test on Simulator | 10 min |
| Archive & Upload | 15 min |
| App Store Connect Setup | 30 min |
| Screenshots & Description | 20 min |
| **Total** | **~2 hours** |
| Apple Review | 1-2 days |

Good luck with your launch! 🚀
