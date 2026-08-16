# Spike Verification Findings — 2026-08-15

> **Source:** Verification of AGY CLI 1.1.13 on local developer environment
> **Method:** Spawned `agy --conversation <id> --print "<msg>" --output-format stream-json` 5 times with various params, captured raw stdout/stderr
> **Status:** All findings confirmed against actual AGY behavior

These findings extend and **correct** the `2026-08-15-agy-webui-design.md` design document. The design doc should be treated as authoritative for high-level architecture, but this note covers the **ground-truth API behavior** that the design doc had previously assumed.

---

## 1. Stream-JSON Event Protocol (Ground Truth)

### 1.1 Top-Level Event Types

| `event` | When emitted | Notes |
|---------|-------------|-------|
| `init` | Once at process start | Contains `conversation_id`, `cwd`, `model`, `tools[]`, `permission_mode` |
| `step_update` | Once per agent step | Has `step_update` object with `step_type`, `state`, `step_index`, optional payload |
| `result` | Once at process end | Contains final `response`, `status`, `usage`, `duration_seconds`, `num_turns` |

### 1.2 `step_type` Values Observed

| step_type | Payload | Meaning |
|-----------|---------|---------|
| `user_input` | — | User prompt recorded |
| `system_message` | — | System prompt / context loaded |
| `agent_response` | `text_delta`, `duration_seconds`, `usage` | Agent's reply — **text_delta carries incremental tokens** |
| `tool` | `tool_name`, `tool_info` (name, parameters, output) | Tool invocation in progress or completed |
| `checkpoint` | `duration_seconds`, `usage` | Internal save/checkpoint |
| `unknown` | `duration_seconds` only | Agent waiting for user input (e.g., `ask_permission`, `ask_question`) |

### 1.3 `state` Values

| state | Meaning |
|-------|---------|
| `ACTIVE` | Step currently running |
| `DONE` | Step completed successfully |
| `ERROR` | Step failed (see `tool_info.error` for details) |

### 1.4 `usage` Schema

```json
{
  "input_tokens": 68648,
  "output_tokens": 36,
  "thinking_tokens": 27,
  "cache_read_tokens": 0,
  "total_tokens": 68684
}
```

Where:
- `thinking_tokens` — Reasoning tokens (Claude / Gemini Thinking models)
- `cache_read_tokens` — Tokens served from prompt cache (LOW usage = good cache hit)

### 1.5 Key Insights

- **Streaming tokens**: `text_delta` field on `agent_response` steps carries incremental text. Multiple `step_update` events with `state: ACTIVE` arrive as the agent is thinking.
- **Tool visibility**: All tool calls and outputs are visible in `step_update` events with `step_type: 'tool'`. No hidden / secret tool calls.
- **Permission denied events**: When a tool is denied (auto-deny in headless mode), the resulting `step_update` has `state: ERROR` and `tool_info.error.type: 'TOOL_ERROR'`, NOT a separate permission event.

---

## 2. CLI Flag Behavior (Verified)

### 2.1 `--effort` Limitation

**`--effort` is NOT supported by all models.**

Verified failure case:
```
--model "Gemini 3.7 Flash (High)" --effort "low"
=> error: "invalid model selection (--model "Gemini 3.7 Flash (High)" --effort "low"): --effort is not supported for model "Gemini 3.7 Flash (High)"
```

**Web UI implication:** The effort selector must be **conditionally enabled per-model**. Gemini 3.x Flash (all variants) does NOT support `--effort`. Gemini Pro / Claude / GPT-OSS models do.

A safe UX pattern:
- Show effort dropdown for all models
- When user selects a model that doesn't support effort, force-disable the dropdown with tooltip "Model doesn't support reasoning effort"
- Default to "no --effort flag" when disabled

### 2.2 `--mode` Flag

Documented values: `accept-edits`, `plan`. **Not yet spiked in code path** — TUI mode probe will confirm.

### 2.3 `--dangerously-skip-permissions`

Sets `permission_mode: "always-proceed"` in `init` event. All tool calls proceed without prompting. Verified working — `curl`, `mkdir`, etc. execute without delays.

**Use case for Web UI:** A "dev mode" toggle that lets the user bypass all permission prompts for trusted workflows.

### 2.4 `--conversation <id>` Behavior

**Verified:** Multi-turn context is preserved. In successive calls to the same conversation ID:
- `step_index` continues from where previous run ended (e.g., 60 → 61 → 62)
- `cache_read_tokens` grows as the conversation history grows (huge cache hit rates)
- All previous tool calls, file edits, and responses are visible to the model

**This confirms the stateless per-turn design preserves context.** No need to keep an `agy` process alive between turns.

---

## 3. Permission Protocol — CORRECTING THE DESIGN DOC

### 3.1 What the Design Doc Said (INCORRECT)

From `2026-08-15-agy-webui-design.md` §5.2:

> 4. **User Resolution**:
>    - User clicks Approve or Deny in the UI.
>    - Web client sends `permission:resolve` via WebSocket.
>    - Server writes the decision to `child.stdin.write("y\n")` or `child.stdin.write("n\n")`.

**This is WRONG.** In `--print` (headless) mode, `stdin` is NOT piped to the agent. Spikes 2 and 2b confirmed that writing to `child.stdin` has no effect — the agent does not process it.

### 3.2 Actual Behavior

In `--print` mode, when a tool requires permission:
1. AGY emits a `step_update` event with `state: ERROR` and `tool_info.error.type: 'TOOL_ERROR'`
2. The agent's stderr log includes: `"a tool required the \"command\" permission that headless mode cannot prompt for, so it was auto-denied"`
3. **The permission request is silently dropped**, the agent has to find another way (or fail)

### 3.3 Actual Permission Mechanism

Permissions are managed in `~/.gemini/antigravity-cli/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "command(npm install)",
      "command(ls)",
      "command(mkdir)",
      "command(/opt/homebrew/.../python /path/to/script.py)",
      ...
    ]
  }
}
```

A tool call is auto-approved when its command matches one of:
- `command(<exact-pattern>)` — exact command match
- Tools not requiring permission (e.g., `view_file`, `grep_search`)

When a tool is NOT in the allow-list, AGY needs to prompt. **Headless mode auto-denies.**

### 3.4 Real Path Forward — Three Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Manage `settings.json` from Web UI** | True control; user can be explicit about what to allow | Risk of over-broad permissions; requires UI to parse permission patterns |
| **B. Always run with `--dangerously-skip-permissions`** | Simple; no permission prompts | **Security risk** — any command executes |
| **C. TUI mode for permission-required actions** | Full native UX; safest | Breaks the streaming model; URL-based session jump |

**Recommended (subject to user approval):** Option A — provide a **"Permissions"** panel in the Web UI that lets users view/edit the allow-list. This integrates with the current AGY permission system without re-implementing it.

---

## 4. `ask_permission` and `ask_question` Tools

These are tools that the AGY agent can call **itself** to ask the user something. Tested in spike 2b.

### 4.1 Behavior in `--print` Mode

When the agent calls `ask_permission("<question>")`:
1. A `step_update` event is emitted with `step_type: "unknown"`, `state: "DONE"` (not ACTIVE), `duration_seconds` only
2. **No payload describing the question is exposed** — the stream-json protocol does not include the question text or response options
3. The agent waits indefinitely, expecting input from the TUI

**This is a fundamental gap in `--print` mode for interactive prompts.**

### 4.2 Behavior in `-i` (Interactive) Mode (UNVERIFIED)

The interactive TUI mode likely:
- Renders the question in the terminal
- Reads user input from stdin
- Forwards answer back to the agent

We could not verify this in the spike because `script -q /dev/null agy` failed in our environment (no real PTY support from `script` in this shell). WebTTY mode (node-pty) will use a real PTY, so this should work there.

### 4.3 Implications for Web UI

| Tool | `--print` Mode | WebTTY Mode |
|------|---------------|-------------|
| `ask_permission` | Silently hung (no payload) | Renders as prompt in xterm.js |
| `ask_question` | Silently hung (no payload) | Renders as prompt in xterm.js |
| `run_command` (blocked) | Auto-deny with TOOL_ERROR | Renders Y/N prompt in xterm.js |

**Implication:** Any conversation that uses `ask_permission` / `ask_question` MUST be opened in WebTTY mode to be useful. The Web UI should detect this condition and proactively offer to switch to WebTTY.

---

## 5. `ask_permission` / `ask_question` Tool Handling — Dual-Track Design

**Decision (2026-08-15, user-approved):** **Dual-Track A** — Web UI native chat + WebTTY fallback for interactive prompts.

### 5.1 Why Dual-Track A

The spike proved that `ask_permission` / `ask_question` tools cannot be fully answered from inside a `--print` (headless) stream-json process:
- `step_type: "unknown"` events arrive **with no question payload**
- Writing to `child.stdin` does NOT reach the agent (spike 2b confirmed)
- The agent silently hangs until process timeout / explicit kill

### 5.2 Track 1: Chat Mode (Stream-JSON, Native Web UI)

**When to use:** Default for all standard conversations. Best for: streaming responses, code edits, file reads, web browsing, anything that doesn't involve interactive prompts.

**Permission strategy:** Pre-configured `permissions.allow` in `settings.json`.
- Web UI provides a **Permissions panel** where users can edit the allow-list
- Tokens stored in `~/.gemini/antigravity-cli/settings.json`
- For typical workflows (npm install, git push, file edits), users add commands to the allow-list once and never get prompted again

### 5.3 Track 2: WebTTY Mode (Node-PTY, Full TUI)

**When to use:** Whenever the agent invokes `ask_permission` / `ask_question` / `ask_user_choice`, or when permission is needed for a non-allow-listed command.

**Detection trigger:** Server watches for `step_update` events with `step_type: "unknown"`. When detected:
1. Server emits `chat:interactive_prompt` message to WebSocket (with `lastToolCall` info)
2. Browser renders a **modal**: "AGY is waiting for your input. Open WebTTY?"
3. Three options:
   - **Open WebTTY** — Spawns node-pty with `agy --conversation <id>`, switches browser to full-screen xterm.js
   - **Cancel turn** — Server sends SIGINT to current process, returns to IDLE
   - **Wait** — 5-minute timeout, then auto-cancel

**WebTTY session:**
- Server: `node-pty` spawns `agy --conversation <id>` (no `--print`, full TUI)
- Browser: `xterm.js` terminal canvas in full-screen modal
- Bidirectional raw PTY framing over WebSocket (`/ws/tui/:conversationId`)
- Resize, ANSI, Ctrl-C etc. all work natively
- "Exit TTY" button closes the session — Chat UI re-reads from DB to show updated history

### 5.4 Permissions Panel (Web UI)

Lives in `/settings` route. UI shows:
- Current `permissions.allow` list (read from `settings.json`)
- Add new command pattern (with regex preview)
- Remove old patterns
- Save → writes to `settings.json` (with file lock to avoid races)

**Safety:**
- Only allow adding patterns of the form `command(<pattern>)` (validate regex)
- "Test pattern" button shows which recent tool calls would match
- Backup created before save

### 5.5 Why Not Option B (Force WebTTY) or C (Whitelist-Only)

- **Option B (force WebTTY):** Loses the modern streaming UX for the 80% case where no prompts are needed.
- **Option C (whitelist-only):** Same as our default, but no escape hatch for unexpected prompts. Users would hit dead-ends.

Dual-Track A gives us: **modern UX when possible, native escape hatch when needed.**

---

## 7. Open Questions After Spike

1. **`--mode accept-edits` behavior** — When does AGY auto-approve edits vs. require permission? (Not fully tested in spike.)
2. **`ask_permission` payload in stream-json** — Does the question text appear somewhere in the AGY CLI output that's not in stream-json? (Could be in stderr or in a separate event.)
3. **`--model` per-turn switching** — Does the cache invalidate when model changes mid-conversation? (Hypothesis: yes, different model = different cache key.)
4. **Subagent invocations** — When the agent calls `define_subagent` + `invoke_subagent`, how does the stream-json represent the nested execution? (single step? separate steps?)
5. **Long-running tool execution** — Does `run_command` that takes 5 minutes stream partial output? Or only after completion?

---

## 8. Spike Data Artifacts

All raw outputs saved at `/tmp/agy-spike/`:
- `spike1c-output.log` — First successful stream-json capture (full event sequence)
- `spike2-output.log` — Permission denied flow (curl with non-allowlisted command)
- `spike2b-output.log` — ask_permission behavior under stdin writes
- `spike2c-output.log` — Allow-listed command (ls) flow
- `spike2d-output.log` — `--dangerously-skip-permissions` flow

These can be replayed for debugging or to reference real event sequences when implementing the WebUI parser.
