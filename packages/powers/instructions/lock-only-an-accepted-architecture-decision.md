---
instruction_id: lock-only-an-accepted-architecture-decision
title: Lock only an accepted architecture decision
summary: A decision record counts as locked only when its status says accepted; proposed and draft records stay unlocked.
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
revision: 1
---

# Lock only an accepted architecture decision
`locked`: always `false` unless type is `ADR` with `Accepted` status
Classify a `Proposed` or `Draft` ADR as `locked: true` — only `Accepted` counts as locked
