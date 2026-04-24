# EdgeLog - Trading Journal App PRD

## Overview
EdgeLog is a professional trading journal mobile app (React Native/Expo + FastAPI/MongoDB) for iOS and Android.

## Authentication
- **Google Sign-In** (both iOS & Android) — native, no browser popup via `@react-native-google-signin/google-signin`
- **Apple Sign-In** (iOS only) — native via `expo-apple-authentication`

## Key Features
- Manual trade entry with full fields
- **Voice Trade Logging** — Whisper STT + GPT-5.2 extraction (Premium: unlimited, Free: 1/week)
- **Calendar View** — Monthly P/L tracker with green/red days + weekly P/L
- AI Performance Reports (GPT-5.2)
- Dashboard with analytics and equity curve
- AdMob ads (free users) via `react-native-google-mobile-ads`
- Premium subscription ($5.99/mo or $49.99/yr) via RevenueCat

## Architecture
```
Mobile App (Expo SDK 54)
├── Package: com.edgelog.app (Android), com.ravuri.edgelog (iOS)
├── Auth: Google Sign-In + Apple Sign-In (iOS)
├── Ads: AdMob banner + interstitial
└── 9 Screens: Login, Home, AddTrade, Dashboard, Calendar, History, Reports, Settings, VoiceTrade

Backend (FastAPI) — Railway: edgelog-backend-production-c841.up.railway.app
├── Auth: POST /api/auth/google, POST /api/auth/apple
├── Voice: POST /api/voice/parse-trade
├── Calendar: GET /api/trades/calendar-summary
├── Privacy/Terms: GET /privacy, GET /terms
└── All v1 endpoints unchanged

Database: MongoDB Atlas (edgelog cluster)
```

## Firebase Config
- Project: edgelog-ba3af
- iOS Client ID: 168585078949-rgs53ketk7c1rgetbq9iftnjhv0jehi0.apps.googleusercontent.com
- Android Client ID: 168585078949-va9hptqsimbnqseaq3ge90rjur2takfc.apps.googleusercontent.com
- Web Client ID: 168585078949-dbma6ti5vg2tm74s0eb7sf66i61rhu8o.apps.googleusercontent.com

## Deployment
- Backend: Railway (production) — always on
- Database: MongoDB Atlas
- URLs: Privacy /privacy, Terms /terms

## Pending
1. iOS build (needs interactive Apple credentials from user's Mac)
2. RevenueCat integration in Expo (Subscribe Now button → RevenueCat purchase flow)
3. App Store resubmission

## Backlog
- Admin panel for coupons
- CSV trade import
- Pre-trade checklist
- Gamification (streaks/achievements)
- Dark/light theme toggle
