# EdgeLog Monetization Implementation Plan

## Pricing Structure

### Free Tier
- Manual trade logging
- Basic dashboard & analytics
- 1 AI report per week
- 14-day history retention
- **Ads shown** (banner + interstitial)

### Premium Tier - $5.99/month or $49.99/year
- Everything in Free
- **No ads**
- **Unlimited AI reports**
- **Unlimited history** (no 14-day limit)
- **MT4/MT5 report import & analysis**
- **Export to Excel/PDF**
- **Share via WhatsApp/Gmail/etc.**

---

## Phase 1: Ad Integration (Google AdMob)

### Ad Placements
1. **Banner Ad** - Bottom of Dashboard page
2. **Interstitial Ad** - After closing a trade (high-value moment)
3. **Interstitial Ad** - After viewing AI report (free tier only)

### Required AdMob Setup
1. Create AdMob account at admob.google.com
2. Create iOS app → Get App ID
3. Create Android app → Get App ID
4. Create ad units for each app:
   - Banner ad unit
   - Interstitial ad unit

### Test Ad IDs (for development)
- Android Banner: `ca-app-pub-3940256099942544/6300978111`
- Android Interstitial: `ca-app-pub-3940256099942544/1033173712`
- iOS Banner: `ca-app-pub-3940256099942544/2934735716`
- iOS Interstitial: `ca-app-pub-3940256099942544/4411468910`

---

## Phase 2: Subscription (RevenueCat)

### Setup Steps
1. Create RevenueCat account at revenuecat.com
2. Create iOS app → Get public API key
3. Create Android app → Get public API key
4. Create "premium" entitlement
5. Create products:
   - Monthly: $5.99/month
   - Yearly: $49.99/year
6. Create offering with both packages

### Features Gated Behind Premium
- Ad removal
- Unlimited AI reports
- Unlimited trade history
- MT4/MT5 import
- Export/Share functionality

---

## Phase 3: MT4/MT5 Import

### Supported File Formats
- MT4 HTML report (Account History)
- MT5 HTML report
- CSV export from MT4/MT5

### Fields to Extract
- Trade pair/symbol
- Direction (buy/sell)
- Entry price
- Exit price
- Lot size
- Profit/Loss
- Open time
- Close time

---

## Phase 4: Export & Share

### Export Formats
- Excel (.xlsx) - Full trade data
- PDF - Formatted report with charts

### Share Options
- WhatsApp
- Gmail
- Copy link
- Any app (native share)

---

## Implementation Order

1. **Backend changes** (Premium status, AI report limits)
2. **AdMob integration** (Capacitor plugin)
3. **RevenueCat integration** (Subscriptions)
4. **Paywall UI** (Premium upgrade screen)
5. **MT4/MT5 parser** (Backend)
6. **Export functionality** (Excel/PDF generation)
7. **Share functionality** (Native share API)

---

## Revenue Projection

| Scenario | Monthly Users | Premium % | Monthly Revenue |
|----------|--------------|-----------|-----------------|
| Conservative | 1,000 | 5% | $299/month |
| Moderate | 5,000 | 7% | $2,099/month |
| Optimistic | 10,000 | 10% | $5,990/month |

*After 30% platform fee
