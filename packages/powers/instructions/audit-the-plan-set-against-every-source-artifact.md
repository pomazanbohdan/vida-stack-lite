---
instruction_id: audit-the-plan-set-against-every-source-artifact
title: Audit the plan set against every source artifact
summary: "Before the plan set is final, every artifact the phase draws on is audited; an item that no plan covers stops the finalization and goes back to the owner with the options."
capability_tags:
  - plan-implementation
pattern_tags:
  - dimension-sweep
conditions_applies_when: The plan set is about to be finalized.
conditions_does_not_apply_when: The phase has no source artifacts to audit against.
artifact_contract_output_type: source-audit
artifact_contract_required_data:
  - the audit row of every source artifact
  - the status of each row
  - the options put to the owner for an uncovered item
artifact_contract_verified_by: every source item is covered or the plan set was not finalized silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-source-audit.md
status: active
revision: 1
---

# Audit the plan set against every source artifact
Before finalizing plans, produce a **source audit** covering every artifact type the phase draws on.
If ANY row is ⚠ MISSING, do NOT finalize the plan set silently. Return to the orchestrator:
Options: A) Add a plan to cover this item B) Split phase: move to a sub-phase C) Defer explicitly: add to backlog with developer confirmation
→ Awaiting developer decision before finalizing plan set.
