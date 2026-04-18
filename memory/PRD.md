# EdgeLog - Trading Journal App PRD

## Overview
EdgeLog is a professional trading journal mobile app (React/Capacitor + FastAPI/MongoDB) designed for traders to track, analyze, and improve their trading performance. Supports iOS and Android via Capacitor.

## User Personas
1. **Active Trader** - Logs 3-10 trades daily, needs quick entry and analytics
2. **Learning Trader** - Wants to analyze patterns and improve discipline
3. **Social Trader** - Shares results on social media for accountability

## Core Requirements
- **Google Sign-In ONLY** (Emergent OAuth) — both Android and iOS
- Manual trade entry with all key fields
- 14-day trade history limit (Free Plan)
- Discipline score tracking
- Analytics dashboard with charts
- Mobile-optimized dark theme UI

## What's Been Implemented

### Version 1.0 - MVP (Feb 15, 2026)
- [x] User authentication with Google Sign-In
- [x] Trade CRUD operations (Create, Read, Update, Delete)
- [x] Home screen with today's summary and discipline score
- [x] Add Trade form with all fields
- [x] Dashboard with analytics and charts
- [x] Settings page with discipline rules and reminders
- [x] Bottom navigation with floating add button
- [x] 14-day free plan countdown banner
- [x] Professional dark trading UI

### Version 1.1 - Screenshot & AI Reports (Feb 15, 2026)
- [x] Screenshot Upload (Cloudinary)
- [x] AI Performance Reports (GPT-5.2)
- [x] Social Sharing
- [x] Download as Image

### Version 1.2 - Trade Management (Feb 15, 2026)
- [x] Trade Closing Flow with modal
- [x] Trade History Page with search/filters
- [x] Equity Curve Chart
- [x] Trade Edit/Delete

### Version 1.3 - iOS/Android App Submission (Feb 18-19, 2026)
- [x] iOS app submitted to App Store
- [x] Android .aab uploaded to Google Play
- [x] Store listing, Privacy Policy page

### Version 1.4 - Monetization & Premium (Feb 19-20, 2026)
- [x] Premium Subscription ($5.99/month or $49.99/year)
- [x] 7-Day Free Trial
- [x] AI Report Limiting (Free: 1/week, Premium: Unlimited)
- [x] MT4/MT5 Import (Premium)
- [x] Export to CSV/PDF (Premium)
- [x] Coupon Code System
- [x] RevenueCat Integration
- [x] AdMob Integration

### Version 1.5 - Bug Fixes (Mar 17, 2026)
- [x] Fixed authFetch refactor issues
- [x] Added Trade Outcome on Add page
- [x] P/L toggle (Dollars/Points)
- [x] Fixed EditTradeModal

### Version 1.6 - Auth Overhaul (Apr 18, 2026)
- [x] **Removed Apple Sign-In** — Google Sign-In is now the ONLY auth method
- [x] **Moved native auth tokens to MongoDB** — persistent across server restarts
- [x] **Backend-served auth callback** — `/api/auth/native-callback` with dynamic API URL injection, no hardcoded URLs
- [x] **Cache-busting headers** — no-cache, no-store on callback page (fixes Brave browser caching)
- [x] **Deep link support** — `edgelog://auth` custom scheme + Android intent fallback
- [x] **Asset links served from backend** — `/.well-known/assetlinks.json` endpoint
- [x] **Clean polling mechanism** — 1.5s interval polling in LoginPage.js with proper cleanup
- [x] All tests passed (20/20 backend, all frontend UI tests)

## Architecture
```
Frontend (React + Capacitor)
├── Pages: Login, Home, AddTrade, Dashboard, Settings, Reports, History, Premium, Import, Terms
├── Components: BottomNav, TradeCard, DisciplineRing, CloseTradeModal, EditTradeModal
├── Native: Capacitor for iOS/Android
└── Styling: Tailwind CSS with custom dark theme

Backend (FastAPI)
├── Auth: Emergent OAuth (Google) with native callback + token bridge
├── Trades: CRUD with 14-day retention (Free) / Unlimited (Premium)
├── Analytics: Summary, daily breakdown, equity curve data
├── Reports: AI-powered generation with GPT-5.2
├── Subscription: RevenueCat webhook
├── Import/Export: MT4/MT5, CSV, PDF
├── Cloudinary: Signed upload signatures
└── Settings: Discipline rules, reminders

Database (MongoDB)
├── users
├── user_sessions
├── trades
├── reports
├── coupons
├── user_coupons
├── reminder_settings
└── native_auth_tokens (NEW — persistent token bridge for mobile auth)
```

## Key API Endpoints
- `POST /api/auth/session` - Exchange session_id for token
- `GET /api/auth/native-callback` - Backend-served auth callback with dynamic URL
- `POST /api/auth/native/store` - Store auth token for native retrieval
- `POST /api/auth/native/retrieve` - One-time retrieval of stored auth token
- `GET /.well-known/assetlinks.json` - Android App Links verification
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/trades` - Create trade
- `PUT /api/trades/{trade_id}` - Update/close trade
- `GET /api/analytics/summary` - Dashboard stats
- `POST /api/reports/generate` - Generate AI report
- `GET /api/subscription/status` - Subscription tier

## Pending Issues
1. **RevenueCat Subscriptions Failing on Android (P1)** — offerings not loading
2. **Logout on Android (P2)** — user verification pending
3. **Homepage/Analytics data correctness (P2)** — recurring concern

## Backlog / Future
- App Store resubmission (after stable deployment)
- MT4/MT5 Report Parsing improvements
- Admin panel for coupon management
- CSV trade import
- Pre-trade checklist feature
- Gamification (streaks, achievements)
- Dark/light theme toggle
