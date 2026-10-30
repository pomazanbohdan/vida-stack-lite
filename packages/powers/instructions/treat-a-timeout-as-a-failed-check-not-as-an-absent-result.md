---
instruction_id: treat-a-timeout-as-a-failed-check-not-as-an-absent-result
title: "Treat a timeout as a failed check, not as an absent result"
summary: "A command that times out is a check that failed, exactly like a command that exited non-zero; it is never reported as a check that did not run."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check runs a command that may hang.
conditions_does_not_apply_when: The command always returns promptly.
artifact_contract_output_type: timeout-is-a-failure
artifact_contract_required_data:
  - the three outcomes of the command
  - which outcome blocks
  - what a timeout is reported as
artifact_contract_verified_by: a timeout was reported as a failed check and not as an absent result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gate-predicates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a timeout as a failed check, not as an absent result
- Runs a declared command in a bounded `sh -c` subprocess; **exit 0 → pass, non-zero → block, timeout → block.**
