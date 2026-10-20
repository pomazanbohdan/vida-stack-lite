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
status: active
revision: 1
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
