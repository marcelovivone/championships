# Championships Mobile

**Last updated: 2026-04-30**

Expo SDK 54 app (React Native 0.81.5 / React 19.1.0) tested on iPhone via Expo Go.

## Current features

- Sport → League → Season → Round / Date selectors.
- Prefers Basketball / NBA automatically when those records exist.
- Standings grouped by conference for basketball (Eastern Conference / Western Conference).
- Games list: shows `score - score` for finished games; shows `vs` for unplayed games (nulls suppressed).
- TypeScript compiles clean (`npm run typecheck`).

## Install

```bash
cd mobile
npm install
```

## Start backend

```bash
docker compose up -d        # from repo root
cd backend && npm run start:dev
```

## Start Expo

```bash
cd mobile
npx expo start --host lan --clear   # real device (iPhone / Android on LAN)
# or
npm run start                        # default (Android emulator)
```

On iPhone: open Camera app → scan QR → tap `exp://` link → opens in Expo Go.

## Environment

Edit `mobile/.env.development`:

```
# Real iPhone on LAN
API_BASE_URL=http://192.168.1.156:3000

# Android emulator
# API_BASE_URL=http://10.0.2.2:3000
```

## TypeScript check

```bash
cd mobile
npm run typecheck
```

## Pending tasks

1. NBA standings columns: GB, HOME W-L, AWAY W-L, OT W-L
2. Fix `SafeAreaView` deprecation (use `react-native-safe-area-context`)
3. Play-ins screen
4. Playoffs / Postseason bracket screen

See `documentation/MOBILE_ONBOARDING.md` for full architecture notes and developer workflow.
