---
instruction_id: close-a-requirement-only-when-implemented-verified-and-committed
title: "Close a requirement only when it is implemented, verified and committed"
summary: "A requirement is complete only when the feature is implemented, verified and committed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A requirement is about to be marked as complete.
conditions_does_not_apply_when: The requirement is still in progress.
artifact_contract_output_type: requirement-status
artifact_contract_required_data:
  - the three states that make the requirement complete
artifact_contract_verified_by: the requirement is marked complete only with all three states in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Close a requirement only when it is implemented, verified and committed
Requirement is "Complete" when: - Feature is implemented - Feature is verified (tests pass, manual check done) - Feature is committed
