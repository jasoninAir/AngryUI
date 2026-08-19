# AngryUI Audit Fixes — SDD Progress Ledger

Started: 2026-08-19
Branch: main
Plan: docs/superpowers/plans/2026-08-19-angryui-audit-fixes.md (in-memory — not on disk)

## Task Status

## Task 0.1: COMPLETE (2026-08-19)
- Commit: 0efbf21 fix(security): remove client-controlled dangerouslySkipPermissions
- Review: Approved (84 tests pass, 1 new regression test)
- Issue noted: package.json license "ISC" (≡ MIT, Minor) — not fixed, no functional impact
- Next: Task 0.2 (client token + login screen)

## Task 0.2: COMPLETE (2026-08-19)
- Commits: b642f3b (auth core) + 1d40d8f (fetch→authFetch fix)
- Review: Approved (84 tests pass, re-review clean)
- Issue fixed: 5 missed fetch() → authFetch() conversions
- Next: Task 1.1 (CORS + rate limiting + body limit)

## Task 1.1: COMPLETE (2026-08-19)
- Commit: 0fd9b9f fix(security): CORS whitelist, rate limiting, body limit 50mb→1mb
- Review: Approved (84 tests pass)
- Next: Task 1.2 (WS exponential backoff + ping/pong)

## Task 1.2: COMPLETE (2026-08-19)
- Commit: 605f649 fix(reliability): WS exponential backoff + server-side ping/pong
- Review: Approved (87 tests pass, 3 new backoff unit tests)
- Next: Task 1.3 (graceful shutdown pty kill)

## Task 1.3: IN PROGRESS (implementer running)
## Task 1.4: IN REVIEW (reviewer running)
## Task 1.5: COMPLETE — merged into 67075a8 (pino logging commit 1.4)

## Task 1.3: COMPLETE — Approved (PtyManager static registry + killAll + 10s shutdown)
## Task 1.4: IN FIX — WS requestId propagation fix (1 important issue)

## Task 1.4: COMPLETE — Approved (pino logger + requestId; WS requestId propagation fix in 592a56b)

## PHASE 1: COMPLETE ✅
All CRITICAL (0.1, 0.2) and HIGH (1.1-1.5) fixes done and approved.

## PHASE 2: IN PROGRESS — 8 tasks (2.1-2.8) all implementing in parallel
## PHASE 3: PENDING — Tasks 3.1-3.6
## PHASE 4: PENDING — Task 4.1

## PHASE 2: COMPLETE ✅
- 2.1 reconnecting status: c9bf4be ✅
- 2.2 dark toggle: 64c6793 ✅
- 2.3 WebTTY keys: 2e76628 ✅
- 2.4 iOS paste: c9bf4be ✅
- 2.5 useBatterySaver: 330360d ✅
- 2.6 danger highlight: c9bf4be ✅
- 2.7 SQLite backup: 64c6793 ✅
- 2.8 bundle budget: 085677f ✅
NOTE: npm→pnpm switch by implementer (package.json)
All 87 tests pass.

## PHASE 3: IN PROGRESS — Tasks 3.1-3.6 implementing
## PHASE 4: PENDING — Task 4.1
