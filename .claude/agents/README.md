# FadiApp Test Agent Team

Four specialized review agents live here. They cover the quality dimensions the plan's "Verification" section calls out but which don't fit into a Jest suite: pedagogical correctness, Hebrew copy quality, privacy posture, and LLM output structure.

All are **project-scoped** — they travel with the repo and any Claude Code session working in this project gets them automatically.

## When to invoke each

| Agent | Invoke when | Typical cost |
|---|---|---|
| `pedagogy-reviewer` | Sampling N saved lessons before a release, or after any tweak to the designer system prompt | Opus, ~$0.10–0.30 per 10 lessons |
| `hebrew-copy-reviewer` | After edits to `src/i18n/he.ts` or `assets/kb/*.json`, or before a release | Opus, ~$0.05 per full scan |
| `privacy-auditor` | Before any release; after any change touching students / LLM prompts / Drive writes / worker code | Opus, ~$0.05 per full scan |
| `llm-output-validator` | After changes to the system prompt or schema; when a batch of generations surfaces parse errors | Sonnet, ~$0.01 per lesson |

## How to call one

In a Claude Code session:

> Use the pedagogy-reviewer agent to review these three lessons: <paste JSON or file paths>

Or programmatically via the SDK:

```ts
Agent({
  subagent_type: "pedagogy-reviewer",
  prompt: "Review the three lessons at drizzle/scratch/lessons_2026-04-22.json and return verdicts.",
  description: "Pedagogy review of Apr-22 batch"
})
```

## How to run a full QA pass

The agents are intentionally independent — parallel invocation is fine. A good pre-release cycle:

1. **Seed the DB with ~10 representative generations** (different grades, durations, environments, goals). Save or export them.
2. **Run all four agents in parallel** (single message, multiple Agent tool calls).
3. **Land the findings**:
   - `pedagogy-reviewer` findings → fix the prompt / seed KB / activities whitelist.
   - `hebrew-copy-reviewer` findings → edit `he.ts` / KB JSON.
   - `privacy-auditor` findings → fix code before anything else.
   - `llm-output-validator` findings → tighten prompt or schema guards.
4. Re-run only the affected agent to confirm the fix.

The plan's launch gate is **>80% "usable as-is or with minor edits"** from `pedagogy-reviewer` across ≥30 generated lessons. Privacy is a hard gate: **zero P0 findings**.

## What these agents deliberately don't cover

- **Live end-to-end UI walks** — use a human or Detox for the tap-path. Agents don't run the app.
- **Performance budgets** (cold start, timer drift, Opus p95) — measured via instrumented runs, not review.
- **Cross-device RTL rendering** — screenshot diffs are the right tool; deferred.
- **Running unit tests** — Jest already covers the pure wallClock model with 12 tests. Agents are for review, not replication of what a test suite does better.
