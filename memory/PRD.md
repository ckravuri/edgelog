# EdgeLog - Trading Journal App PRD

## Overview
EdgeLog is a professional trading journal mobile app (React Native/Expo + FastAPI/MongoDB) for iOS and Android.

## Core Requirements
- **Google Sign-In** (both iOS & Android) — native, no browser popup
- **Apple Sign-In** (iOS only) — native
- Manual trade entry + **Voice trade logging** (Whisper + GPT)
- **Calendar view** — monthly performance tracker
- Analytics dashboard with charts
- Premium subscription ($5.99/mo) via RevenueCat

## What's Been Implemented

### v1.0–1.5 (Previous sessions)
- Full trade CRUD, analytics, AI reports (GPT-5.2), Cloudinary screenshots
- RevenueCat subscriptions, AdMob ads, coupon system
- MT4/MT5 import, CSV/PDF export

### v2.0 — Expo Rewrite (Apr 18-24, 2026)
- [x] **Full Expo/React Native rewrite** — all 9 screens rebuilt
- [x] **Package name changed** to `com.edgelog.app`
- [x] **Native Google Sign-In** — `@react-native-google-signin/google-signin` with Firebase config
- [x] **Native Apple Sign-In** — `expo-apple-authentication` (iOS only)
- [x] **Backend Google token verification** — `POST /api/auth/google` verifies ID token server-side
- [x] **Backend Apple token verification** — `POST /api/auth/apple` verifies identity token
- [x] **Voice Trade Logging** — Record audio → Whisper STT → GPT extraction → confirm & save
- [x] **Calendar View** — Monthly grid with green/red days, P/L stats
- [x] **Native auth tokens in MongoDB** — persistent across restarts
- [x] **Cache-busting auth callback** — no-cache headers on native callback

## Architecture
```
Mobile App (Expo/React Native)
├── Screens: Login, Home, AddTrade, Dashboard, Calendar, History, Reports, Settings, VoiceTrade
├── Auth: @react-native-google-signin + expo-apple-authentication
├── Voice: expo-av for recording
└── Navigation: @react-navigation (stack + bottom tabs)

Backend (FastAPI)
├── Auth: Google ID token verification + Apple identity token verification + Emergent OAuth (legacy)
├── Voice: Whisper STT + GPT-5.2 extraction (/api/voice/parse-trade)
├── Calendar: /api/trades/calendar-summary
├── Trades/Analytics/Reports/Subscriptions: unchanged from v1
└── MongoDB: all collections

Database (MongoDB)
├── users, user_sessions, trades, reports
├── coupons, user_coupons, reminder_settings
└── native_auth_tokens
```

## Key API Endpoints
- `POST /api/auth/google` — Verify Google ID token, create session
- `POST /api/auth/apple` — Verify Apple identity token, create session
- `POST /api/voice/parse-trade` — Voice → text → structured trade data
- `GET /api/trades/calendar-summary` — Monthly day-by-day P/L summary
- All existing endpoints from v1 remain unchanged

## Firebase Config
- Project: `edgelog-ba3af`
- iOS Client ID: `168585078949-rgs53ketk7c1rgetbq9iftnjhv0jehi0.apps.googleusercontent.com`
- Android Client ID: `168585078949-va9hptqsimbnqseaq3ge90rjur2takfc.apps.googleusercontent.com`
- Web Client ID: `168585078949-dbma6ti5vg2tm74s0eb7sf66i61rhu8o.apps.googleusercontent.com`

## Pending
1. **Railway deployment** — user needs to create project + MongoDB Atlas cluster
2. **EAS development build** — needed to test native Google Sign-In (won't work in Expo Go)
3. **App Store resubmission** — after deployment is stable

## Backlog
- Admin panel for coupons
- CSV trade import
- Pre-trade checklist
- Gamification (streaks/achievements)
- Dark/light theme toggle
