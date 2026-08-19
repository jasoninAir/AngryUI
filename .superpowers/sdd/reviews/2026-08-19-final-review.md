# AngryUI Audit Fixes — Final Branch Review

**Review Date:** 2026-08-19
**Branch:** main
**Base:** dd61fc4197c3f88096d535faea99261a33eeb67e
**Head:** 4649369e76be89c3b783c85d9bfcf6c098630f82
**Tests:** 90 passed (27 test files)
**Reviewer:** Claude (final whole-branch review)

---

## Verdict: ✅ READY TO MERGE

All CRITICAL and HIGH issues from `docs/angryui-audit.md` are resolved.
Minor notes are acceptable for a v1.0 release.

---

## Issues by Phase

### Phase 0 — CRITICAL ✅

| Issue | Fix | Status |
|-------|-----|--------|
| C-01: `dangerouslySkipPermissions` client-controlled | Server-side `AGY_WEBUI_ALLOW_SKIP_PERMISSIONS` gate; Zod schema explicitly excludes field; regression test added | ✅ Fixed |
| A-02: Client never sends Bearer token | `authFetch()` wrapper; LoginScreen; BroadcastChannel sync; WS `?token=` | ✅ Fixed |

### Phase 1 — HIGH ✅

| Issue | Fix | Status |
|-------|-----|--------|
| A-03: CORS wide open | `cors({ origin: whitelist or false })`; `AGY_WEBUI_CORS_ORIGINS` env | ✅ Fixed |
| A-04: No rate limiting | `express-rate-limit`: 500 req/15min global | ✅ Fixed |
| A-05: JSON limit 50MB | Reduced to 1MB | ✅ Fixed |
| D-01: Fixed 2s reconnect | Exponential backoff `min(2^n * 1s + jitter, 30s)` + retryCount UI | ✅ Fixed |
| A-07/D-02: No WS heartbeat | Server pings every 25s; pong handler; dead connection dropped | ✅ Fixed |
| D-04: No pty cleanup on shutdown | `PtyManager.killAll()` on SIGTERM; 10s force-exit | ✅ Fixed |
| D-05/E-03: console.log only | Pino structured logging; `X-Request-Id` on all errors | ✅ Fixed |
| C-02: settings.json readable | chmod 0o600 after atomic write | ✅ Fixed |

### Phase 2 — MEDIUM ✅

| Issue | Fix | Status |
|-------|-----|--------|
| A-08: No reconnect UI | "Reconnecting (N)…" in Sidebar | ✅ Fixed |
| B-03: Dark mode no toggle | `ThemeToggle` with localStorage persistence | ✅ Fixed |
| B-04: WebTTY keys too small | 44pt min height; Ctrl+D/W, PgUp/Dn added | ✅ Fixed |
| B-02: iOS paste fallback | Paste handler + paperclip button fallback | ✅ Fixed |
| F-03: Battery saver implicit | `useBatterySaver` hook with visibilitychange | ✅ Fixed |
| C-03: No danger highlighting | `dangerCommands.ts` with regex chips on permission card | ✅ Fixed |
| D-03/C-04: SQLite no backup | `backupSqliteDb()` on startup; 7-file retention | ✅ Fixed |
| F-04: No bundle budget | `rollup-plugin-visualizer` + 500KB CI check | ✅ Fixed |

### Phase 3 — LOW ✅

| Issue | Fix | Status |
|-------|-----|--------|
| B-01: No PWA | vite-plugin-pwa; manifest; workbox; meta tags | ✅ Fixed |
| F-01: No ARIA | nav/role/aria-label/skip-to-content throughout | ✅ Fixed |
| B-05: Long message list | `react-window` FixedSizeList virtualization | ✅ Fixed |
| B-06: No camera | `capture="environment"` + Camera button | ✅ Fixed |
| D-06: Weak PM2 config | `kill_timeout: 10000`; log files; max_restarts: 10 | ✅ Fixed |
| D-07: Silent postinstall | `check-node-pty.js` with clear error message | ✅ Fixed |

### Phase 4 — Contract ✅

| Issue | Fix | Status |
|-------|-----|--------|
| E-01: No WS protocol spec | `server/ws/protocol.ts` Zod schemas; `safeParse` at entry; contract tests | ✅ Fixed |

---

## Minor Notes (Not Blocking)

1. **HTTPS/TLS (A-01):** Not implemented in code — acknowledged in audit as "reverse proxy solution". README documents Caddy/nginx templates. This is the correct architectural decision for a single-port Node.js server.

2. **E2E tests missing:** No Playwright/Cypress tests exist. The bypass regression test (chatHandler.bypass.test.ts) covers the most critical security path. Acceptable for v1.0.

3. **npm→pnpm switch:** A Phase 2 implementer switched the lockfile. `package.json` scripts still use `npm`; pnpm is used for `pnpm install` of new deps. No functional breaking change.

---

## Architecture Assessment

**New abstractions are clean:**
- `server/utils/logger.ts` — minimal pino wrapper, no unnecessary abstraction
- `server/ws/protocol.ts` — discriminated union Zod schemas, correctly excludes `dangerouslySkipPermissions`
- `src/lib/auth.ts` — thin storage wrapper, no unnecessary complexity
- `src/hooks/useBatterySaver.ts` — single-responsibility hook

**No over-engineering observed.** Each new file has one clear job.

---

## Test Coverage

- 90 tests across 27 files
- Regression test for the most critical security fix (C-01 bypass)
- WS protocol round-trip contract tests
- All existing tests preserved (no regressions)

---

## Final Recommendation

**Merge to main.** All CRITICAL and HIGH issues are resolved. The codebase is materially more secure, reliable, and usable for the target "developer on the road" scenario. Minor notes are acceptable trade-offs for a v1.0 release.
