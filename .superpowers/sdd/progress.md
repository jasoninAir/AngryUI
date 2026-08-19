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
