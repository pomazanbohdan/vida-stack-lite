---
instruction_id: state-the-failure-signal-next-to-every-verify-command
title: State the failure signal next to every verify command
summary: A runnable check carries the statement of what its output looks like when it fails; without one it is not an acceptance test.
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: A runnable verification command is written into the work.
conditions_does_not_apply_when: The command is a placeholder that cannot run yet.
artifact_contract_output_type: failure-signal
artifact_contract_required_data:
  - the command
  - the signal that decides that it failed
artifact_contract_verified_by: every runnable command names an observable failure signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# State the failure signal next to every verify command
A command with no expressible failure mode is not an acceptance test.
Name an OBSERVABLE signal, never the word "failure" — `non-zero exit` is complete, `the command fails` is a restatement.
Ask yourself: if this command were silently doing nothing, what in its output would tell me?
`TBD`/`TODO`/`N/A`/`none`/`unknown`/`?`/`-` are rejected outright as whole values.
If you cannot answer, fix the command — do not invent a statement for it.
