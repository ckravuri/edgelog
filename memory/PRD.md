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

### Version 1.4 - Monetization & Premium Features (Feb 19, 2026)
- [x] **Premium Subscription Model** - $5.99/month or $49.99/year
- [x] **Subscription Status API** - Track premium status
- [x] **AI Report Limiting** - Free: 1/week, Premium: Unlimited
- [x] **MT4/MT5 Import** - Parse HTML/CSV reports (Premium)
- [x] **Export to CSV** - Download trade history (Premium)
- [x] **RevenueCat Webhook** - Handle subscription events
- [x] Premium page with plan selection
- [x] Import page for MT4/MT5 trades
- [x] Updated Settings page with subscription status

## Architecture
```
Frontend (React PWA + Capacitor)
├── Pages: Login, Home, AddTrade, Dashboard, Settings, Reports, History, Premium, Import
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
└── reminder_settings
```

## Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| Emergent OAuth | Google Sign-In | ✅ Active |
| Apple Sign-In | iOS native auth | ✅ Implemented |
| Cloudinary | Screenshot storage | ✅ Active |
| GPT-5.2 | AI insights | ✅ Active |
| RevenueCat | Subscriptions | ⏳ Setup Required |
| Google AdMob | Ads | ⏳ Setup Required |

## Monetization Model

### Free Tier
- Manual trade logging
- Basic dashboard & analytics
- 1 AI report per week
- 14-day history retention
- **Ads shown**

### Premium ($5.99/month or $49.99/year)
- No ads
- Unlimited AI reports
- Unlimited history
- MT4/MT5 import
- Export to CSV/PDF
- Share via WhatsApp/Email

## Prioritized Backlog

### P0 (In Progress)
- [ ] AdMob integration (banner + interstitial ads)
- [ ] RevenueCat integration (subscription handling)
- [ ] Complete Google Play Store submission (needs 12 testers for 14 days)

### P1 (High Priority)
- [ ] PDF export for reports
- [ ] Native share functionality
- [ ] Push notifications via Firebase
- [ ] Extended analytics (by emotion, by session)

### P2 (Future)
- [ ] Trading Rules Checklist
- [ ] Journal Notes Page
- [ ] Streak & Achievements
- [ ] Instagram story format for sharing
- [ ] Multiple account support
- [ ] Dark/Light Theme Toggle

## App Store Status
| Platform | Status | Notes |
|----------|--------|-------|
| iOS App Store | Waiting for Review | Build 5 submitted with Sign in with Apple |
| Google Play | Internal Testing | Needs 12 testers for 14 days before Production |

## Technical Notes
- Backend URL: REACT_APP_BACKEND_URL from .env
- Auth uses httpOnly cookies with 7-day expiry
- Images stored in Cloudinary under user-specific folders
- AI reports use Emergent LLM Key for GPT-5.2
- Equity curve calculated as cumulative sum of daily P&L
- Apple Sign-In: Bundle ID is com.ravuri.edgelog
- Premium users bypass 14-day trade cleanup

---
Last Updated: February 19, 2026
