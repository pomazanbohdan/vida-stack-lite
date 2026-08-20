# Scheduled runtime-log analysis

This is the operator instruction for creating and managing the periodic
Codex automation that analyzes portable runtime logs. It is a derived runtime
tooling instruction; it does not change lifecycle authority, delivery gates,
skills, checkpoints, receipts, backlog or Wiki content.

## Create the automation

Use the Codex automation surface, not a generic ChatGPT Scheduled Task, because
the analyzer reads the local repository. Create one `cron` automation for the
`vida-stack-lite` project with:

- schedule: weekdays (Monday through Friday) at 10:00 local repository time;
- model: `gpt-5.6-luna` with low reasoning for the bounded read-only pass;
- execution environment: local project;
- prompt: the contents of `agent-runtime/prompts/scheduled-runtime-reliability.md`;
- command: `npm run agent-runtime:analyze:runtime -- --output summary --days 14`.

The prompt's `--days 14` window means that each run records the current run
date/time and analyzes the preceding fourteen days. The analyzer also keeps a
watermark at `.planning/agent-flow/runtime-analysis/watermark.json`, so an
unchanged snapshot is reported as `no_new_signal` without rereading or
re-hashing unchanged files.

Do not create a second automation with the same purpose. Inspect the existing
automation list or local automation records first; update the matching entry
when one exists.

## Manage the automation

- **Run now:** use the automation's run-now action only for a bounded diagnostic
  check; it must use the same repository and prompt.
- **Pause:** pause the automation when the repository is being migrated,
  dependencies are being repaired, or runtime artifacts are known to be
  incomplete. Pausing does not delete the watermark or reports.
- **Resume:** resume only after the local runtime and repository are readable.
- **Change schedule:** preserve the prompt and project binding; change only the
  schedule field and record the reason in the automation change note.
- **Disable/delete:** disable rather than delete when an audit trail or
  watermark must be retained. Delete only when the automation is permanently
  superseded.
- **Recover an over-budget run:** do not silently increase limits. Keep the
  measured `duration_ms` and typed GAP, then investigate the source count,
  artifact size, or host contention.

## Safety and interpretation

The analyzer is read-only. It never spawns reviewers or architects, changes a
skill, edits authoritative documentation, advances a checkpoint, authorizes
delivery, or treats a Backlog/dashboard projection as lifecycle authority.
Full logs remain in their existing derived locations; the automation reports
only compact pointers, counts, fingerprints, severity and next action. Skill
findings are recommendations for a separate bounded skill task and never an
automatic `SKILL.md` patch.

If an analysis snapshot changes while it is being read, the result is
`status: "blocked"` and the watermark is not advanced. Rerun after the host
stabilizes. A recurring `GATE_BLOCKED` is not a defect unless the report proves
valid preconditions and a lawful operation rejected the state.

The reusable prompt is maintained at
`agent-runtime/prompts/scheduled-runtime-reliability.md`.

