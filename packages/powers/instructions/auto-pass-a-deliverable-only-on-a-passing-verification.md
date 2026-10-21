---
instruction_id: auto-pass-a-deliverable-only-on-a-passing-verification
title: Auto-pass a deliverable only on a passing verification
summary: A deliverable skips the human only when it carries a passing verification; everything else is put to a human.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A deliverable is classified for acceptance.
conditions_does_not_apply_when: The deliverable is already confirmed by a human.
artifact_contract_output_type: coverage-classification
artifact_contract_required_data:
  - the verification entries and their status
  - the judgment flag
artifact_contract_verified_by: the deliverable auto-passes only with a non-empty verification whose every status is pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.compact.md
status: active
revision: 1
---

# Auto-pass a deliverable only on a passing verification
A deliverable auto-passes (no human prompt) **only** when `human_judgment: false` AND `verification` is non-empty AND every `verification[].status` is `pass`. This is the narrow, fully-proven case.
**Everything else is presented to a human** — `human_judgment: true`, an empty `verification:`, any non-`pass`/`unknown` status, or any schema error.
