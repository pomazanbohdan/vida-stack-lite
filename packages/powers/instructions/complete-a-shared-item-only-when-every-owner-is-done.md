---
instruction_id: complete-a-shared-item-only-when-every-owner-is-done
title: Complete a shared item only when every owner is done
summary: "An identifier that several units declare is complete only when all of them are finished; the ready subset is computed first, so the first unit to finish cannot flip the shared item."
capability_tags:
  - coordinate-program
pattern_tags:
  - completion-criteria
conditions_applies_when: Several units of the same effort declare the same identifier.
conditions_does_not_apply_when: Only one unit declares the identifier.
artifact_contract_output_type: shared-item-state
artifact_contract_required_data:
  - the identifiers declared
  - the units that declare them
  - the ready subset
artifact_contract_verified_by: a shared identifier reads complete only after every unit that declares it finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Complete a shared item only when every owner is done
a requirement ID declared by more than one plan in this phase must not read `Complete` until every plan declaring it has finished
otherwise the first plan to finish flips it `Complete` while its sibling plans are still running, before phase verification ever gets a chance to catch a real gap.
Compute the ready subset first, then mark only those
It scans sibling `*-PLAN.md` files in this plan's phase directory and blocks an ID only when a sibling ALSO declares it and that sibling has no `*-SUMMARY.md` yet.
An ID no sibling declares is always ready (single-plan requirements mark immediately, no added latency).
