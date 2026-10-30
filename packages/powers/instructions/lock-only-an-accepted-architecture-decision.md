---
instruction_id: lock-only-an-accepted-architecture-decision
title: Lock only an accepted architecture decision
summary: A decision record counts as locked only when its status says accepted; proposed, draft and deprecated records stay unlocked.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - frozen-intent
conditions_applies_when: The lock state of an architecture decision record is determined.
conditions_does_not_apply_when: The document is not a decision record.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the status
  - the lock state
artifact_contract_verified_by: the lock state is true only for an accepted decision record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Lock only an accepted architecture decision
`locked`: always `false` unless type is `ADR` with `Accepted` status
`Deprecated` is a valid ADR status: keep the record readable and leave it unlocked
Classify a `Proposed`, `Draft` or `Deprecated` ADR as `locked: true` — only `Accepted` counts as locked
