---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-understand-and-untangle
title: Understand unfamiliar code before changing it
summary: "Use effect and feature sketches, reverted scratch refactoring and a plain-language story to find pinch points, golden masters and natural boundaries."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Changing unfamiliar or tangled code.
conditions_does_not_apply_when: A local change in code whose behavior is already understood and covered.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Tests sit at a pinch point that covers upstream effects, and understanding artifacts are not left as production changes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L147-L170"
status: active
revision: 1
---

# Understand unfamiliar code before changing it

Before changing unfamiliar code, use effect sketches, feature sketches, scratch refactoring that is later reverted, and a plain-language system story to find pinch points for tests. Test at a pinch point where it covers upstream effects; use golden-master testing and a method object for monster methods, and extract god-class features along natural boundaries. When time is limited, sprout or wrap a spot changed once and add tests when that spot changes again.
