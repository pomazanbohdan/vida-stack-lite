---
instruction_id: reject-a-verify-command-that-never-terminates
title: Reject a verify command that never terminates
summary: "A verification command in watch mode, or one that only runs the whole end-to-end suite, is a failing gate and not a measurement."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A plan names the command that verifies a task.
conditions_does_not_apply_when: The command is a focused test or build that terminates on its own.
artifact_contract_output_type: verify-command-ruling
artifact_contract_required_data:
  - the command
  - the flag that makes it non-terminating
  - the ruling
artifact_contract_verified_by: no watch-mode or full-suite command was accepted as the verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/nyquist-compliance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a verify command that never terminates
For each `<automated>` command:
- Full E2E suite (playwright, cypress, selenium) → **WARNING** — suggest faster unit/smoke test
- Watch mode flags (`--watchAll`) → **BLOCKING FAIL**
- Delays > 30 seconds → **WARNING**
