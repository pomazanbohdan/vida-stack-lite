---
instruction_id: treat-an-unusable-verification-status-as-neither-pass-nor-fail
title: Treat an unusable verification status as neither pass nor fail
summary: "A report whose status is outside the closed set is refused, and the refusal is an error to record — never a verdict to infer and never a unit to drop silently."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification report arrives with a status the reader does not accept.
conditions_does_not_apply_when: The report carries one of the accepted statuses.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the status that was reported
  - the error that was recorded
  - the options offered
artifact_contract_verified_by: the refusal is recorded as the failure reason and no verdict was inferred from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/quick-verification.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/verification-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Treat an unusable verification status as neither pass nor fail
A report `status` outside `passed | gaps_found | human_needed` is not a status at all
never read the refusal as a verdict, and never drop the item silently
Do **not** improvise a result
Report that verification produced no usable status
then offer: 1) Re-run the verifier, 2) Accept as-is without verification
