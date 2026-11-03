---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-find-seams
title: Find a seam and its enabling point
summary: "Locate a reachable place where behavior can be substituted without editing production code, and identify where the choice is made."
capability_tags:
  - design-structure
pattern_tags:
  - test-placement-strategy
conditions_applies_when: Code cannot be instantiated or sensed by a test.
conditions_does_not_apply_when: A seam the test cannot reach or control.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The test substitutes behavior at a reachable seam and the production location is unchanged.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L53-L76"
status: active
revision: 1
---

# Find a seam and its enabling point

Find a seam where behavior can be substituted without editing the production location, and identify its enabling point where the behavior choice is made. Prefer reachable seams; a seam the test cannot control is not useful. Object, link/import, and preprocessing seams are described, with preprocessing identified as the last resort; dynamic-language patching can couple tests to file layout.
