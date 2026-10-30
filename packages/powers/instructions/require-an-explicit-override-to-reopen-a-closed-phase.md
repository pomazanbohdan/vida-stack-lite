---
instruction_id: require-an-explicit-override-to-reopen-a-closed-phase
title: Require an explicit override to reopen a closed phase
summary: A phase that was closed cannot be replanned by accident; the override is explicit and the reopening is announced in the record.
capability_tags:
  - plan-implementation
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A phase was closed and is about to be replanned.
conditions_does_not_apply_when: The phase was never closed.
artifact_contract_output_type: override-record
artifact_contract_required_data:
  - the override
  - the warning that was recorded
artifact_contract_verified_by: the replan ran only under an explicit override and the warning is in the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/plan-a-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Require an explicit override to reopen a closed phase
If a phase has `VERIFICATION.md` with `status: passed`, it is considered closed. Attempting to replan it stops with an error. If the closeout was incorrect, override with `--force`:
A warning is emitted into the transcript and any committed plan docs.
