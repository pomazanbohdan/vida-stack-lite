---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-change-algorithm
title: Follow the legacy change algorithm
summary: "Identify change points and test points, break dependencies conservatively, write tests, then change and refactor with separate verification."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Making a behavior change in untested code.
conditions_does_not_apply_when: A change already covered by trustworthy tests.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each step is verified separately, behavior and structure changes are separated, and tests cover the changed paths."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L30-L52"
status: active
revision: 1
---

# Follow the legacy change algorithm

For a change in untested code, identify change points, find test points, break dependencies, write tests, then change and refactor. Keep pre-test dependency edits conservative and mechanical; preserve signatures exactly and use compiler feedback to find affected sites. Verify each step separately, test where effects surface, and grow coverage along changed paths; separate behavior and structure changes.
