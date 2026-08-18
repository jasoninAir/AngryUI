# Task 1.1: CORS whitelist + rate limiting + body 1MB limit

## Context
Task 1.1 of the AngryUI audit fix plan. Fixes HIGH issues A-03, A-04, A-05.
Project: /Users/jason/myprojects/angryui (React 19 + TypeScript + Express + node-pty).
Current HEAD: 1d40d8f

## Problems from Audit
- **A-03**: `server/index.ts:17` — `app.use(cors())` with no options, fully open
- **A-04**: No rate limiting anywhere — brute-force token guessing, DoS possible
- **A-05**: JSON body limit 50MB — excessive, DoS vector

## Goal
1. CORS restricted to an explicit whitelist (env var `AGY_WEBUI_CORS_ORIGINS`, default: same-origin only)
2. Global rate limit: 500 req / 15 min per IP
3. JSON body limit reduced from 50MB to 1MB

## Files to Modify

### 1. `package.json`
Add `express-rate-limit` as a dependency:
```bash
npm install express-rate-limit
```

### 2. `server/config.ts`
Add `corsOrigins: string[]` to config:
```typescript
corsOrigins: (process.env.AGY_WEBUI_CORS_ORIGINS || '').split(',').filter(Boolean),
```
And CLI flag `--cors-origins` (default: empty string).

### 3. `server/index.ts` — MODIFY lines 17-19 + add rate limit middleware

Replace the current CORS + body parser setup (around lines 17-19):

```typescript
// CORS — restrict to explicit whitelist (default: same-origin only)
const corsOptions: cors.CorsOptions = config.corsOrigins.length > 0
  ? {
      origin: (origin, cb) => {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
    }
  : false;  // same-origin when no whitelist
app.use(cors(corsOptions));

// Body limits — 1MB for JSON (50mb was a DoS vector)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting — global
import rateLimit from 'express-rate-limit';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
}));
```

## Test Strategy
- `npm test -- --run` — all 84+ tests must pass
- Manual: with a token set, try fetching from an origin NOT in the whitelist — should get CORS error
- Manual: verify JSON body >1MB returns 413 (Express default)

## Success Criteria
1. `npm test -- --run` → ALL tests pass
2. Commit with message:
   "fix(security): CORS whitelist, rate limiting, body limit 50mb→1mb

   - CORS restricted to AGY_WEBUI_CORS_ORIGINS env list; default same-origin
   - express-rate-limit: 500 req/15min global
   - JSON/urlencoded limit reduced to 1mb
   - Fixes A-03, A-04, A-05 (HIGH)"

## Global Constraints
- TypeScript strict mode ON
- Node 18+
- MIT license
- `npm test -- --run` must pass
- New dependency: `express-rate-limit` (allowed — security fix)
