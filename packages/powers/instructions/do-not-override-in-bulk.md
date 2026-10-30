---
instruction_id: do-not-override-in-bulk
title: Do not override in bulk
summary: "An override is for an intentional deviation; an incomplete implementation, an unclear must-have or a whole batch of failures is not an override."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: Several must-haves failed for the same phase.
conditions_does_not_apply_when: One intentional deviation is being accepted.
artifact_contract_output_type: override-decision
artifact_contract_required_data:
  - the failed must-haves
  - the decision taken
artifact_contract_verified_by: the plan was revisited instead of the failures being overridden in bulk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verification-overrides.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Do not override in bulk
Overrides are NOT appropriate when:
- The implementation is simply incomplete — fix it instead
- The must-have is unclear — clarify it instead
- The developer wants to skip verification — that undermines the process
- Multiple must-haves are failing for the same phase — if more than 2-3 items need overrides, revisit the plan instead of overriding in bulk
