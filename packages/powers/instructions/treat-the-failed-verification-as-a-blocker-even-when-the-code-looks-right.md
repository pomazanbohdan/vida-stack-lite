---
instruction_id: treat-the-failed-verification-as-a-blocker-even-when-the-code-looks-right
title: Treat the failed verification as a blocker even when the code looks right
summary: A failed verification blocks the advance; the code can look correct while the criterion the request actually carried was never met.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification failed and the implementation looks correct on inspection.
conditions_does_not_apply_when: No verification ran.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the failed verification
  - the criterion it failed
artifact_contract_verified_by: the failure is carried as a blocker and the criterion it failed is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/drive-gsd-from-a-tracker-issue.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat the failed verification as a blocker even when the code looks right
Treat `verification_failed` as a blocker even when the code looks correct — the failure usually surfaces a missed acceptance criterion from the original issue.
