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

## Architecture
```
Frontend (React PWA)
├── Pages: Login, Home, AddTrade, Dashboard, Settings, Reports, History
├── Components: BottomNav, TradeCard, DisciplineRing, CloseTradeModal, EditTradeModal
└── Styling: Tailwind CSS with custom dark theme

Backend (FastAPI)
├── Auth: Emergent OAuth integration
├── Trades: CRUD with 14-day retention
├── Analytics: Summary, daily breakdown, equity curve data
├── Reports: AI-powered generation with GPT-5.2
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
- [ ] App Store submission preparation

### P1 (High Priority - Premium Features)
- [ ] Push notifications via Firebase
- [ ] Trade import from CSV
- [ ] Extended analytics (by emotion, by session, by pair)
- [ ] Trading Rules Checklist
- [ ] Journal Notes Page
- [ ] Streak & Achievements

### P2 (Future Premium)
- [ ] Premium plan with unlimited history
- [ ] Broker API integration (MT4/MT5, TradingView)
- [ ] Instagram story format for sharing
- [ ] Multiple account support
- [ ] Dark/Light Theme Toggle

## Next Tasks
1. Wait for Google/Apple Developer account approvals
2. Prepare app icons and splash screens for submission
3. Create premium upgrade flow and pricing page
4. Add Firebase for real push notifications

## Technical Notes
- Backend URL: REACT_APP_BACKEND_URL from .env
- Auth uses httpOnly cookies with 7-day expiry
- Images stored in Cloudinary under user-specific folders
- AI reports use Emergent LLM Key for GPT-5.2
- Equity curve calculated as cumulative sum of daily P&L

---
Last Updated: February 15, 2026
