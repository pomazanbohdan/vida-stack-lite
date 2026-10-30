---
instruction_id: give-the-guard-a-contract
title: Give the guard a contract
summary: "The guard reads the whole change, returns three distinct exit codes, and reports the rule and the location without the value."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: You write a check that guards a recorded quality bar against being lowered.
conditions_does_not_apply_when: A de facto tool already performs the check.
artifact_contract_output_type: guard-contract
artifact_contract_required_data:
  - the input the guard reads
  - the moves it detects
  - the three exit codes
  - what the report may contain
artifact_contract_verified_by: "the guard's failure-to-run exit code is distinguishable from its clean exit code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/references/floor-guard.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/bootstrap.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gate-predicates.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/gate-evidence-and-exit-status.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/api-coverage-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/live-dom-uat-capability.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Give the guard a contract

This is the reference. Adapt the patterns to your stack; keep the contract identical.

- **Input:** the diff between the merge base and the working tree (added *and* removed lines, plus untracked files). A guard that reads only `git diff` misses new files and staged-but-uncommitted work.
- **Detects the five moves:** a weakened threshold in the constraints file, a test made easier (`.skip`, a deleted test file, an assertion removed from a test that stayed), a silenced checker (a new suppression comment), unfinished work (a stub or empty `catch`), a new Exceptions row.
- **Exit codes:** `0` clean, `1` at least one floor violation (block the change), `2` the guard could not run (no merge base, not a git repo). Never let a `2` read as a `0`.
- **Reports the rule and the location, never the matched secret value.** Redaction is not optional.
- **Tightening is silent, loosening is loud:** only surfaces moves that lower the bar.

**Patterns are the only stack-specific part.** Add your language's suppression and stub forms to the three regexes; the diff plumbing, the constraints-file checks, and the exit codes stay as-is.

A `.constraintsignore` (one glob per line) lets you exempt a path the guard would otherwise flag; check each added line's file against it before flagging, so a genuine exception is a tracked file rather than a loosened rule.

**This is a starting point, not a finished tool.** It is deliberately regex-shallow: it catches the cheap-road-to-green moves agents actually make, not a determined human hiding a change. That is the right trade for a check that runs on every diff. Once you outgrow it, move to a real runner (Escalation Path level 3).
- Run the environment validator before any test or audit run:
- `0` — all checks passed, safe to proceed
- `1` — one or more checks failed — see the report
- `2` — tool error (e.g., `node` not found, corrupt `package.json`)
- on any internal error it fails open (exit 0) — a broken advisory must never wedge a session's tool calls.
- When the guard is enabled, this block leg **fails closed**
- **Step 1** — if the check command itself failed (non-zero exit, e.g. a malformed predicate / unknown kind), route per `onError` (`halt` or `skip`).
- **Step 2** — if the command succeeded, a `blocking: true` gate halts on `block: true`; an advisory gate shows `message` and continues.
- Before execution, three placeholders are substituted from the gate context; all others are left untouched for `sh` to interpret:
- An undefined placeholder interpolates to the empty string.
- Omit the field and the guard's original unconditional block stays in force, which is why absence is always the safe default.
Unreadable is a distinct state from none.
A gate reads evidence as `found` (a value; an empty file is `found ''`), `none` (the thing authoritatively does not exist: `ENOENT`, or `ENOTDIR` because a parent is a file) or `unreadable` (it exists or may exist and could not be read: `EISDIR`, `EACCES`, `EIO`, an encoding failure, an unresolvable phase, a plan scan that did not see every plan).
`none` is a legitimate answer and each gate keeps its documented policy for it; `unreadable` is never coerced to `''`, `false` or an empty list.
A gate that could not read its evidence used to behave exactly like a gate that read it and found nothing.
The exit code is a function of the verdict. One total function maps the outcome to a registered code: positive verdicts `0`; a negative verdict `1` in status mode; a read-and-genuinely-empty scope `66` (`NO_INPUT`); `unreadable` `69` (`UNAVAILABLE`) in both modes. No verb picks a code.
Unestablished scope is not a negative verdict.
It now holds the seal instead, reporting `scope_unavailable: true`.
the discriminator is *bytes examined*, never *signals found*.
`nothing_to_report` is never conflated with `could_not_look`.
A report claiming no issues when it never opened a browser is worse than no report; the artifact carries a closed reason enum so the two are always distinguishable.
