---
instruction_id: record-the-deferral-when-you-advance-past-incomplete-work
title: Record the deferral when you advance past incomplete work
summary: "Advancing past unfinished work is a recorded decision: the report names the gaps, the cost of advancing, and every deferred item keeps its source."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The run is about to advance although earlier work is incomplete.
conditions_does_not_apply_when: Nothing earlier is incomplete.
artifact_contract_output_type: deferral-record
artifact_contract_required_data:
  - the incomplete items
  - the consequences of advancing
  - the source of each deferred item
artifact_contract_verified_by: every deferred item is recorded with its source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the deferral when you advance past incomplete work
If incomplete prior work is found, show a structured completeness report:
Advancing before resolving these may cause:
Verification gaps - future phase verification won't have visibility into what prior phases shipped
Context loss - plans that ran without summaries leave no record for future agents
Each deferred item keeps its source.
Commit the deferral record.
