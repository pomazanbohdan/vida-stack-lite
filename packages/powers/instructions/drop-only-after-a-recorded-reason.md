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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/board.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/spec-phase-edge-completeness-probe.md
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
