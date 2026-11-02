---
instruction_id: tell-nothing-changed-from-nothing-found
title: Tell nothing changed from nothing found
summary: "An empty file list means there is nothing new to re-review, not that the work has no standing findings; the two are reported differently."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: The computed scope of a review is empty.
conditions_does_not_apply_when: The scope contains at least one file.
artifact_contract_output_type: empty-scope-report
artifact_contract_required_data:
  - the empty scope
  - what the empty scope means
artifact_contract_verified_by: "the report says there is nothing new to review, not that there are no findings"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell nothing changed from nothing found
Means nothing new to re-review - NOT a phase with no standing findings.
No source files changed in phase
Skipping review.
