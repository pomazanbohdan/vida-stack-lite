---
instruction_id: require-an-automated-verification-command-for-every-task
title: Require an automated verification command for every task
summary: "Every task carries an automated verification command or a first task that creates the test; a watch-mode flag never terminates, a full end-to-end suite is too slow for the loop and the coverage of the tasks must not lapse."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan states what verifies each task.
conditions_does_not_apply_when: The verification of the phase is done by the phase-level check alone.
artifact_contract_output_type: verification-coverage
artifact_contract_required_data:
  - the automated command of every task
  - the wave coverage
  - the test that is created first
artifact_contract_verified_by: every task has a command that terminates and no run of tasks lacks a verification
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

# Require an automated verification command for every task
- `<verify>` must contain `<automated>` command, OR a Wave 0 dependency that creates the test first
- If `<automated>` is absent with no Wave 0 dependency
→ Critical
- Watch mode flags (`--watchAll`)
→ Critical
- Full E2E suite (playwright, cypress, selenium)
→ Minor
suggest faster unit/smoke test
- Delays > 30 seconds
→ Minor
Per wave, any consecutive window of 3 implementation tasks must have ≥2 with `<automated>` verify.
3 consecutive without
→ Critical
