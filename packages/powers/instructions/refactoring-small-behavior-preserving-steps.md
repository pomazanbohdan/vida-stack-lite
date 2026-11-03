---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-small-behavior-preserving-steps
title: Refactor in small behavior-preserving steps
summary: "Use small tested transformations that change organization without changing observable behavior, and treat smells as structural signals."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Changing code organization without changing observable behavior.
conditions_does_not_apply_when: A rewrite that intentionally changes behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each step preserves observable behavior and has a test result.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L14-L19"
status: active
revision: 1
---

# Refactor in small behavior-preserving steps

Refactoring consists of small, tested transformations that change code organization without changing observable behavior; rewriting combines structural and behavioral change and makes failures harder to attribute. Treat code smells as structural signals, not bugs or personal failings, and use named refactorings to address them.
