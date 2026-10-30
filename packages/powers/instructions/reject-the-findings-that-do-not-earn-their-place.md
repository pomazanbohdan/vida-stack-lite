---
instruction_id: reject-the-findings-that-do-not-earn-their-place
title: Reject the findings that do not earn their place
summary: "Drop the findings the verification refuted, the negligible ones whose fix costs more than a correction, and the ones whose fix is to edit the plan under review."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The findings have been graded and some of them have to be dropped before the report.
conditions_does_not_apply_when: Every finding is confirmed and worth keeping.
artifact_contract_output_type: rejected-findings
artifact_contract_required_data:
  - each rejected finding
  - the reason it was rejected
artifact_contract_verified_by: every rejected finding carries the reason it was rejected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject the findings that do not earn their place
Reject `false` findings on their refutation.
Reject `Minor` findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly -- no proof needed) and the fix is more than a direct correction or deletion -- adding guards, branches, parameters, or other complexity.
Reject any finding whose fix is to edit the plan under review.
