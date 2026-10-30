---
instruction_id: reject-a-finding-as-out-of-scope-only-when-the-intent-excludes-it
title: Reject a finding as out of scope only when the intent excludes it
summary: Only the captured intent can put a finding out of scope; the scope section of the plan and the shape of the diff cannot.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding is proposed as out of scope.
conditions_does_not_apply_when: No finding is being set aside.
artifact_contract_output_type: scope-decision
artifact_contract_required_data:
  - the finding
  - the intent clause that excludes it
  - the decision
artifact_contract_verified_by: "the exclusion is grounded in the intent, not in the plan or the diff"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject a finding as out of scope only when the intent excludes it
Out of scope: reject or defer a finding as out of scope only when the intent itself excludes it — not because the plan's scope section or the shape of the diff says so.
If only those would exclude it, keep the finding: the plan drew the line somewhere the intent did not
