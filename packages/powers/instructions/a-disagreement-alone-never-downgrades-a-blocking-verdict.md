---
instruction_id: a-disagreement-alone-never-downgrades-a-blocking-verdict
title: A disagreement alone never downgrades a blocking verdict
summary: "A blocking verdict is lowered only by a concrete fix that resolves the exact deficiency, or by re-examination that shows the earlier application was mistaken."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The author of the reviewed artefact disagrees with a blocking verdict.
conditions_does_not_apply_when: The author has produced a concrete fix for the named deficiency.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the verdict
  - the concrete fix or the re-examination that changed it
artifact_contract_verified_by: the verdict was lowered only for a concrete fix or a corrected application of the criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# A disagreement alone never downgrades a blocking verdict
**Anti-capitulation rule (re-verification turns):** If the researcher disagrees with a BLOCK verdict or submits a revised spec, The Auditor re-examines the revised content against the criteria. Researcher disagreement alone is never grounds to downgrade a BLOCK. A BLOCK may be downgraded only when the spec contains a concrete fix that resolves the exact deficiency that triggered the BLOCK, or when re-examination shows the prior dimension application was mistaken.
"We'll handle it in implementation" or "it's implied" are not concrete fixes.
