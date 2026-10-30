---
instruction_id: mark-out-of-scope-criteria-as-needs-review
title: Mark out-of-scope criteria as needs review
summary: "A criterion that cannot be checked within the declared scope of the check is marked for human review, with the missing check named."
capability_tags:
  - verify-work-results
pattern_tags:
  - scope-routing
conditions_applies_when: A criterion falls outside what the check is able to observe.
conditions_does_not_apply_when: Every criterion is inside the declared scope.
artifact_contract_output_type: scope-marker
artifact_contract_required_data:
  - the criterion
  - the check it needs
  - the review it is handed to
artifact_contract_verified_by: every out-of-scope criterion is marked and names the check it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Mark out-of-scope criteria as needs review
- Scope limit for this version: DOM observation against stated criteria only. No screenshot diffing, no accessibility audit, no performance tracing. If a criterion needs one of those, mark it `needs_review` and say which.
- Record `passed` when the stated condition is observably true, `needs_review` when it is ambiguous or requires human judgement (subjective aesthetics, content accuracy).
