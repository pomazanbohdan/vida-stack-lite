---
instruction_id: never-auto-resolve-two-locked-decisions-that-contradict
title: Never auto-resolve two locked decisions that contradict
summary: "Two accepted decision records that contradict each other are a blocking conflict; the resolution is the owner's."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - stop-on-conflict
conditions_applies_when: Two accepted decision records in the same set contradict each other.
conditions_does_not_apply_when: Only one of the two is locked.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the two contradictory decisions
  - the escalation
artifact_contract_verified_by: the contradiction is escalated rather than decided
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never auto-resolve two locked decisions that contradict
Critical
two locked ADRs in the ingest set that contradict
both in `new` and `merge` modes.
Never auto-resolve.
An ADR with `locked: true` produces decisions that cannot be auto-overridden by any source, including another LOCKED ADR.
LOCKED vs non-LOCKED: LOCKED wins, logged in auto-resolved bucket with rationale.
