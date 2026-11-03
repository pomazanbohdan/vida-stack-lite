---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-treat-as-untested
title: Treat legacy code as code without tests
summary: "Break dependencies only enough to establish tests, then cover and modify rather than editing without feedback."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: "Changing code that has no reliable tests, regardless of its age."
conditions_does_not_apply_when: Code with a trustworthy test suite that already covers the change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change starts from tests that cover the modified behavior, or the dependency work needed to add them."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat legacy code as code without tests

Treat legacy code as code without tests, regardless of age or appearance. Before changing it, break dependencies only as much as needed to establish tests; cover and modify rather than editing without feedback.
