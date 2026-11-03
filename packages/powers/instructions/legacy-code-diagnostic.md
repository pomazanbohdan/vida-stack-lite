---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-diagnostic
title: Run the legacy-code diagnostic
summary: "Check change coverage, harness construction, sensing, separation of behavior and structure changes, impact, observed assertions, seam cost and coverage growth."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review before changing legacy code.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L184-L196"
status: active
revision: 1
---

# Run the legacy-code diagnostic

Use the diagnostic questions to check change coverage, test-harness construction, sensing, separation of behavior and structure changes, change impact, observed assertions, seam cost, and coverage growth; perform the matching action when a check fails.
