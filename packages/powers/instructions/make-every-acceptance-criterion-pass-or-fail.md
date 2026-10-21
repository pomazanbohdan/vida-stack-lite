---
instruction_id: make-every-acceptance-criterion-pass-or-fail
title: Make every acceptance criterion pass or fail
summary: An acceptance criterion is a checkbox that can be decided; a subjective phrase is not a criterion.
capability_tags:
  - define-quality-bar
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for a piece of work.
conditions_does_not_apply_when: The work has no acceptance criteria.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the criteria
  - the observable condition each one decides
artifact_contract_verified_by: every criterion can be decided as passed or failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Make every acceptance criterion pass or fail
**Acceptance criteria must be pass/fail checkboxes** — no "should feel good" or "looks reasonable."
Acceptance criteria must be pass/fail — no subjective criteria
