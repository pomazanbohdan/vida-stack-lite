---
instruction_id: never-reshape-a-closed-record
title: Never reshape a closed record
summary: A finished or dropped item and its plan are the record; they are not reshaped to a newer template and completed work is not rewritten as a new breakdown.
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: "A work item is finished, dropped, or already published."
conditions_does_not_apply_when: The item is still open and is being revised.
artifact_contract_output_type: closed-record
artifact_contract_required_data:
  - the record as it was written
  - the reason it is left alone
artifact_contract_verified_by: the closed record is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/getting-deeper.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/break-work-into-stories-and-track-it.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/closed-phase-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/handle-quick-and-fast-tasks.md
status: active
revision: 3
---

# Never reshape a closed record
A done or dropped ticket and its plan are the record: do not reshape them to a newer template.
Do not rewrite completed or active work as a new breakdown.
Keep the plans: they own status and historical evidence.
Keep completed plans. Deleting one removes the state and evidence later builds, review, and retrospective read.
Replanning a closed phase silently rewrites plan docs that no longer match the shipped code, so the workflow must hard-stop here unless the operator explicitly overrides.
those states mean planning was finished but verification did not pass (or has gone stale), and replanning is a legitimate next step.
The reset is **refused** — every row is preserved untouched rather than risk destroying data under a schema the tool doesn't recognize.
