---
instruction_id: offer-the-repair-instead-of-running-it
title: Offer the repair instead of running it
summary: The repair is offered to the person and only runs after they asked for it.
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The check found issues that can be repaired automatically and the repair was not requested.
conditions_does_not_apply_when: The repair was already requested.
artifact_contract_output_type: repair-offer
artifact_contract_required_data:
  - the number of repairable issues
  - the offer
  - the answer
artifact_contract_verified_by: the repair ran only after it was asked for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Offer the repair instead of running it
**If repairable issues exist and --repair was NOT used:**
Ask user if they want to run the repair to fix N issues automatically?
If yes, re-run with --repair flag and display results.
