# EdgeLog - Trading Journal App PRD

## Overview
EdgeLog is a professional trading journal PWA designed for traders to track, analyze, and improve their trading performance. Built with React frontend, FastAPI backend, and MongoDB database.

## User Personas
1. **Active Trader** - Logs 3-10 trades daily, needs quick entry and analytics
2. **Learning Trader** - Wants to analyze patterns and improve discipline
3. **Social Trader** - Shares results on social media for accountability

## Core Requirements (Static)
- Google Sign-In authentication (Emergent OAuth)
- Apple Sign-In for iOS devices
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
- [x] Dashboard with analytics and charts (Win/Loss, P&L, Daily breakdown)
- [x] Settings page with discipline rules and reminders
- [x] Bottom navigation with floating add button
- [x] 14-day free plan countdown banner
- [x] Professional dark trading UI with JetBrains Mono font

### Version 1.1 - Screenshot & AI Reports (Feb 15, 2026)
- [x] **Screenshot Upload** - Cloudinary integration for trade chart screenshots
- [x] **AI Performance Reports** - GPT-5.2 powered weekly/monthly insights
- [x] **Social Sharing** - Twitter, Facebook, WhatsApp share buttons
- [x] **Download as Image** - Export professional report card as PNG
- [x] Screenshot modal viewer for full-size images
- [x] Report card with professional design and watermark

### Version 1.2 - Trade Management (Feb 15, 2026)
- [x] **Trade Closing Flow** - Slide-up modal to mark trades as Win/Loss/Breakeven
- [x] Close price input with auto-P&L calculation
- [x] Quick P&L buttons (-100, -50, -25, +25, +50, +100, +200)
- [x] **Trade History Page** - Full trade list with search and filters
- [x] Filter by: All, Open, Wins, Losses
- [x] Summary stats bar (Trades, Wins, Losses, P&L)
- [x] **Equity Curve Chart** - Cumulative P&L visualization over time
- [x] **Trade Edit/Delete** - Edit notes, delete trades from modal
- [x] Click interactions: Open trades → Close modal, Closed trades → Edit modal

### Version 1.3 - iOS/Android App Submission (Feb 18-19, 2026)
- [x] **Apple Sign-In** - Native iOS sign-in with Capacitor plugin
- [x] App icon created and submitted
- [x] iOS app submitted to App Store (Waiting for Review)
- [x] Android .aab uploaded to Google Play Console
- [x] Store listing content (descriptions, screenshots)
- [x] Privacy Policy page

### Version 1.4 - Monetization & Premium Features (Feb 19-20, 2026)
- [x] **Premium Subscription Model** - $5.99/month or $49.99/year
- [x] **7-Day Free Trial** - Auto-activated for new users
- [x] **Subscription Status API** - Track premium/trial status
- [x] **AI Report Limiting** - Free: 1/week, Premium: Unlimited
- [x] **MT4/MT5 Import** - Parse HTML/CSV reports (Premium)
- [x] **Export to CSV** - Download trade history (Premium)
- [x] **PDF Report Download** - Professional PDF reports (Premium)
- [x] **Coupon Code System** - Percentage off or free days
- [x] **RevenueCat Integration** - Handle subscription purchases (iOS/Android)
- [x] **AdMob Integration** - Banner and interstitial ads for free users
- [x] **Restore Purchases** - Button to restore on new device
- [x] Premium page with plan selection
- [x] Import page for MT4/MT5 trades
- [x] Terms of Service page
- [x] Updated Settings page with trial/premium status

### Version 1.5 - Bug Fixes (Mar 17, 2026)
- [x] **Fixed authFetch refactor issues** - Fixed broken template literals across 5 files
- [x] **Added Trade Outcome on Add page** - Can now specify Win/Loss/Open when adding trade
- [x] **P/L toggle (Dollars/Points)** - User can choose to enter P/L in dollars or points
- [x] **Fixed EditTradeModal** - Was sending literal `${trade.trade_id}` instead of actual ID

## Architecture
```
Frontend (React PWA + Capacitor)
├── Pages: Login, Home, AddTrade, Dashboard, Settings, Reports, History, Premium, Import, Terms
├── Components: BottomNav, TradeCard, DisciplineRing, CloseTradeModal, EditTradeModal
├── Native: Capacitor for iOS/Android with Sign in with Apple
└── Styling: Tailwind CSS with custom dark theme

Backend (FastAPI)
├── Auth: Emergent OAuth (Google) + Apple Sign-In verification
├── Trades: CRUD with 14-day retention (Free) / Unlimited (Premium)
├── Analytics: Summary, daily breakdown, equity curve data
├── Reports: AI-powered generation with GPT-5.2 (rate limited)
├── Subscription: RevenueCat webhook, status checking
├── Import: MT4/MT5 HTML/CSV parser
├── Export: CSV/JSON trade export
├── Cloudinary: Signed upload signatures
└── Settings: Discipline rules, reminders

Database (MongoDB)
├── users (with subscription_tier, subscription_expires_at)
├── user_sessions
├── trades
├── reports
├── coupons
├── user_coupons
└── reminder_settings
```

## Key Files Reference
- `frontend/src/utils/authFetch.js` - Centralized authenticated API calls
- `frontend/src/pages/AddTradePage.js` - Trade entry with outcome/P&L
- `frontend/src/components/EditTradeModal.js` - Edit closed trades
- `frontend/src/components/CloseTradeModal.js` - Close open trades
- `frontend/src/pages/HomePage.js` - Home dashboard
- `frontend/src/pages/DashboardPage.js` - Analytics
- `frontend/src/context/MonetizationContext.js` - RevenueCat/AdMob

## Pending Issues (P0/P1)
1. **RevenueCat Offerings Not Loading (P1)** - Premium page shows "offerings not loaded" error
2. **Android Google Sign-In (P2)** - Broken, needs debugging

## Backlog / Future Features
- Admin panel for coupon management
- CSV trade import (not MT4/MT5)
- Pre-trade checklist feature
- Gamification (streaks, achievements)
- Dark/light theme toggle
- Push notifications for reminders
- Multiple account/broker support

## API Endpoints
- `POST /api/auth/session` - Exchange session_id for token
- `POST /api/auth/apple` - Apple Sign-In verification
- `GET /api/auth/me` - Get current user
- `POST /api/trades` - Create trade
- `PUT /api/trades/{trade_id}` - Update/close trade
- `DELETE /api/trades/{trade_id}` - Delete trade
- `GET /api/trades` - Get all trades
- `GET /api/trades/today` - Get today's trades
- `GET /api/analytics/summary` - Dashboard stats
- `GET /api/analytics/daily` - Daily P&L breakdown
- `POST /api/reports/generate` - Generate AI report
- `GET /api/subscription/status` - Get subscription tier
- `POST /api/coupons/apply` - Apply coupon code
- `POST /api/import/mt4mt5` - Import MT4/MT5 trades
