---
instruction_id: fall-back-to-the-undecided-state-on-an-unknown-value
title: Fall back to the undecided state on an unknown value
summary: A disposition column is a closed vocabulary; a value outside it is not a decision and the row falls back to the undecided state.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A disposition is read from a record that a person may have edited.
conditions_does_not_apply_when: The value is produced by the tool and never edited by hand.
artifact_contract_output_type: disposition-fallback
artifact_contract_required_data:
  - the closed vocabulary of dispositions
  - the value that was read
  - the state the row falls back to
artifact_contract_verified_by: a value outside the vocabulary leaves the row undecided
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/code-review-pipeline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Fall back to the undecided state on an unknown value
The disposition column is a closed vocabulary — `open`, `fixed`, `skipped`, `deferred`.
A hand-edited value outside it is not treated as a decision: the row falls back to `open`, so a typo cannot quietly mark a phase as triaged.
`open` means recorded but not yet triaged, and it is the only value the gate assigns on its own.
