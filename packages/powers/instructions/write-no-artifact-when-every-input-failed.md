---
instruction_id: write-no-artifact-when-every-input-failed
title: Write no artifact when every input failed
summary: "When every reviewer failed or every reviewer was skipped, no review document is written and nothing is committed; the failure is reported instead of a summary that claims a review ran."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: The inputs of an artifact all failed or all were skipped.
conditions_does_not_apply_when: At least one input produced a result.
artifact_contract_output_type: failed-run-report
artifact_contract_required_data:
  - the lanes that failed
  - the lanes that were skipped
  - the fact that no artifact was written
artifact_contract_verified_by: no document was written and no commit was made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write no artifact when every input failed
do NOT write `REVIEWS.md` and do NOT run the commit below — there is nothing to review
Report the total lane failure to the user
do not proceed to `present_results`' summary claiming a review ran
