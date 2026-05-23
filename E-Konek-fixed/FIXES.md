# E-Konek Occi.Mindo Transit — Applied Fixes

## What was changed and why

---

### Fix 1 — Server-side PIN verification (`server/routes/authRoutes.ts`)

**Problem:** PINs (`2001`, `2002`, `1234`) were hardcoded as plain text inside `LoginScreen.tsx`,
which is compiled into the public JS bundle. Anyone opening DevTools could read them.

**What changed:**
- `LoginScreen.tsx` — removed all client-side PIN constants. The `handlePinSubmit` function now
  calls `POST /api/auth/verify-pin` instead of comparing locally.
- `server/routes/authRoutes.ts` — **new file**. Stores PINs as SHA-256 hashes. Hashes the
  incoming PIN and compares. On match, returns a signed HMAC session token.
- `server/routes/authRoutes.ts` — also exposes `POST /api/auth/verify-token` which validates
  and checks TTL (12 hours) of a token.
- `server/index.ts` — mounts `/api/auth` with a rate limiter: max 10 attempts per IP per 15 min.
- `App.tsx` — `SessionGuard` component verifies the stored token on startup. On failure it clears
  auth state. If the server is unreachable (offline mode), the token is trusted as-is.
- `.env.example` — added `SESSION_SECRET` (required, 32+ char random string).

**To change PINs:** update the hash constants in `server/routes/authRoutes.ts`:
```
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('YOUR_NEW_PIN').digest('hex'))"
```

---

### Fix 2 — Firestore real-time sync (`src/lib/firebase.ts`, `src/context/AppContext.tsx`)

**Problem:** All state was in `useState`. Refreshing the page wiped every ship, trip, booking
and transaction. Multiple devices/tabs could not see each other's changes.

**What changed:**
- `src/lib/firebase.ts` — rewritten with full Firestore helpers: `subscribeCollection`,
  `fsSet`, `fsAdd`, `fsUpdate`, `fsDelete`.
- `src/context/AppContext.tsx` — `AppProvider` now attaches `onSnapshot` listeners for all 8
  collections on mount. Data flows: Firestore → React state (live, real-time).
- First-run seeding: if a collection returns empty, the provider writes the seed data to
  Firestore once, so subsequent loads use the live snapshot.
- New write helpers exposed on context: `persistShip`, `persistTrip`, `persistFerryBooking`,
  `persistVanBooking`, `persistAnnouncement`, `updateShipStatus`, `updateTripStatus`,
  `updateBookingStatus`.
- `Panel1.tsx`, `Panel2.tsx`, `Panel3.tsx`, `SuperAdminDashboard.tsx` — all write operations
  (create voyage, update status, confirm/cancel booking, refund, mark-paid, payout) now call
  the corresponding Firestore helper in addition to their local state update. This is
  **optimistic UI**: the local state updates immediately, Firestore is written in background.
- `firestoreReady` flag added to context. `App.tsx` shows a branded loading spinner until
  the first snapshot arrives from each collection.
- `firestore.rules` — strengthened with role-based rules (`hasRole` claim check) and made
  audit log and payout history append-only. Transactions can never be deleted.

---

### Fix 3 — localStorage persistence (`src/context/AppContext.tsx`)

**Problem:** The offline queue (`offlineQueue`) was in-memory. If the browser tab closed while
offline, all queued bookings were lost. Auth session was also lost on refresh.

**What changed:**
- `offlineQueue` — reads initial value from `localStorage` on mount; every state update
  writes back. Survives page reloads, browser restarts, and PWA cache reloads.
- `sessionToken` and `sessionRole` — stored in `localStorage` on login, cleared on logout.
  `isAuthenticated` is derived from whether a token exists in storage, so users stay logged in
  across refreshes.
- Weather cache — written to `localStorage` so the last known weather is shown immediately
  on load, before the API call completes.
- All `localStorage` operations are wrapped in try/catch to handle quota errors gracefully.

---

### Fix 4 — Firestore security rules (`firestore.rules`)

**Problem:** Original rules were largely incomplete — `/vessels` and `/trips` had `allow read: true`
but bookings required any signed-in user to write, with no role distinction.

**What changed:**
- Added `hasRole(role)` helper that checks `request.auth.token.role` (custom claim).
- `isStaff()` — port, terminal, or superadmin.
- Transactions: staff can create, only superadmin can update (for refunds/paid flag), nobody
  can delete (financial records are immutable).
- Payout history and audit log: append-only (no update/delete).
- Audit log: any authenticated user can append, only superadmin can read.

> **Note:** To use role-based rules, after PIN verification you should issue a Firebase Custom
> Token with `{ role: 'port' | 'terminal' | 'superadmin' }` and sign in with
> `signInWithCustomToken(auth, token)`. Until then, rules fall back to `isSignedIn()` which
> accepts anonymous auth — call `signInAnonymously(auth)` in your login flow.

---

## Setup checklist

```bash
# 1. Copy env file and fill in values
cp .env.example .env

# Required .env values:
#   VITE_FIREBASE_*   — from your Firebase console > Project Settings > Web App
#   SESSION_SECRET    — any random 32+ char string

# 2. Install dependencies (nothing new required)
npm install

# 3. Run dev server (Express + Vite)
npm run dev

# 4. Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

## Files changed

| File | Change |
|---|---|
| `src/App.tsx` | Added `SessionGuard`, Firestore loading gate |
| `src/lib/firebase.ts` | Full rewrite — Firestore helpers |
| `src/context/AppContext.tsx` | Firestore listeners, localStorage persistence, new write helpers |
| `src/components/LoginScreen.tsx` | Server-side PIN verification, removed client PINs |
| `src/features/montenegro/Panel1.tsx` | All write ops wired to Firestore |
| `src/features/land/Panel2.tsx` | All write ops wired to Firestore |
| `src/features/passenger/Panel3.tsx` | Booking submits wired to Firestore |
| `src/components/SuperAdminDashboard.tsx` | Refund and payout wired to Firestore |
| `server/index.ts` | Added auth route + rate limiter |
| `server/routes/authRoutes.ts` | **New** — PIN hash verification + session token |
| `firestore.rules` | Role-based rules, immutable audit/financial records |
| `.env.example` | Added `SESSION_SECRET` |
