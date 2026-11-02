---
instruction_id: write-fix-plans-only-when-there-are-gaps
title: Write the fix plans only when there are gaps
summary: "The repair plans are written only when gaps were found, and each one groups the related fixes and carries its own verification task."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - completion-criteria
conditions_applies_when: A verification report found gaps.
conditions_does_not_apply_when: No gaps were found.
artifact_contract_output_type: fix-plan-set
artifact_contract_required_data:
  - the fixes each plan carries
  - the verification task it ends with
artifact_contract_verified_by: the plans exist only for the gaps and each one ends with a verification task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write the fix plans only when there are gaps
Only generate if gaps_found
Group related fixes into single plans
Keep to 2-3 tasks per plan
Include verification task in each plan
