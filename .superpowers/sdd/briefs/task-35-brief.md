# Task 3.5: PM2 ecosystem strengthening

## Context
Task 3.5 of the audit fix plan. Fixes LOW issue D-06.
Project: /Users/jason/myprojects/angryui

## Goal
Strengthen PM2 ecosystem config: kill_timeout 10s, log files, max_restarts.

## File to Modify
- `ecosystem.config.cjs`

## Changes
```javascript
module.exports = {
  apps: [{
    name: 'angryui',
    script: 'dist-server/index.js',
    kill_timeout: 10000,
    wait_ready: true,
    listen_timeout: 5000,
    max_memory_restart: '300M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    out_file: 'logs/angryui.out.log',
    error_file: 'logs/angryui.err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }]
};
```

Add `logs/` to `.gitignore` if not already there.

## Success Criteria
1. `npm test -- --run` → ALL pass
2. Commit: "perf(ops): PM2 config — kill_timeout 10s, log files, max_restarts 10"
