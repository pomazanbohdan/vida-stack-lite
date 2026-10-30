---
instruction_id: drop-only-after-a-recorded-reason
title: Drop only after a recorded reason
summary: "An item is dropped only after a line says why, and the items that still wait on it are repointed."
capability_tags:
  - plan-implementation
pattern_tags:
  - decision-trail
conditions_applies_when: A work item is to be dropped.
conditions_does_not_apply_when: The item is being closed as done.
artifact_contract_output_type: drop-record
artifact_contract_required_data:
  - the reason it was dropped
  - where the reason is recorded
  - the items that still wait on it
artifact_contract_verified_by: the reason is recorded before the item is dropped and the items that wait on it are repointed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/spec-phase-edge-completeness-probe.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Drop only after a recorded reason
Drop only after a `Dropped:` line says why: in the ticket's Notes, or in its epic's Notes when the ticket has no file.
A dropped ticket still blocks what waits on it, in any epic: `status` lists them under `blocks`; remove or repoint it in each one's `after` with the user.
A `dismissed` resolution MUST require a non-empty reason.
Recorded with its reason; empty dismissals are rejected
