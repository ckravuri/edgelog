# EdgeLog - Trading Journal App PRD

## Overview
EdgeLog is a professional trading journal PWA designed for traders to track, analyze, and improve their trading performance. Built with React frontend, FastAPI backend, and MongoDB database.

## User Personas
1. **Active Trader** - Logs 3-10 trades daily, needs quick entry and analytics
2. **Learning Trader** - Wants to analyze patterns and improve discipline
3. **Social Trader** - Shares results on social media for accountability

## Core Requirements (Static)
- Google Sign-In authentication (Emergent OAuth)
- Apple Sign-In placeholder (ready for activation)
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
- [x] **Download as Image** - Export report card as PNG
- [x] Screenshot modal viewer for full-size images
- [x] Report card with professional design and watermark

## Architecture
```
Frontend (React PWA)
├── Pages: Login, Home, AddTrade, Dashboard, Settings, Reports
├── Components: BottomNav, TradeCard, DisciplineRing
└── Styling: Tailwind CSS with custom dark theme

Backend (FastAPI)
├── Auth: Emergent OAuth integration
├── Trades: CRUD with 14-day retention
├── Analytics: Summary, daily breakdown
├── Reports: AI-powered generation
├── Cloudinary: Signed upload signatures
└── Settings: Discipline rules, reminders

Database (MongoDB)
├── users
├── user_sessions
├── trades
├── reports
└── reminder_settings
```

## Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| Emergent OAuth | Google Sign-In | ✅ Active |
| Cloudinary | Screenshot storage | ✅ Active |
| GPT-5.2 | AI insights | ✅ Active |
| Apple Sign-In | iOS auth | ⏳ Pending Apple Developer Account |

## Prioritized Backlog

### P0 (Critical)
- [ ] Apple Sign-In activation (pending Apple Developer account)
- [ ] Trade closing flow UI (mark as win/loss with P&L)

### P1 (High Priority)
- [ ] Push notifications via Firebase
- [ ] Trade import from CSV
- [ ] Extended analytics (by emotion, by session, by pair)

### P2 (Nice to Have)
- [ ] Premium plan with unlimited history
- [ ] Broker API integration (MT4/MT5, TradingView)
- [ ] Instagram story format for sharing
- [ ] Streak tracking and achievements
- [ ] Multiple account support

## Next Tasks
1. Implement trade closing modal with outcome selection
2. Add Firebase for real push notifications
3. Create premium upgrade flow
4. Add more chart types (equity curve, drawdown)

## Technical Notes
- Backend URL: REACT_APP_BACKEND_URL from .env
- Auth uses httpOnly cookies with 7-day expiry
- Images stored in Cloudinary under user-specific folders
- AI reports use Emergent LLM Key for GPT-5.2

---
Last Updated: February 15, 2026
