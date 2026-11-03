---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-characterization-tests
title: Pin actual behavior with characterization tests
summary: "Probe what the code actually does, pin the observed value, use golden masters for complex output, and characterize the paths the change will touch."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: Adding tests to existing behavior that has no specification.
conditions_does_not_apply_when: A behavior already specified by an authoritative test.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The test asserts observed behavior rather than an imagined requirement, and volatile data is normalized."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L77-L100"
status: active
revision: 1
---

# Pin actual behavior with characterization tests

Characterization tests pin what code actually does, not what a specification or expectation says. Probe behavior, inspect the failure, and pin the observed value; use golden masters for complex outputs and review snapshots while normalizing volatile data. Characterize paths the change will touch. Pin bugs found during characterization with a comment and ticket, then fix them later as a separate deliberate change.
