---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-small-functions
title: Keep functions small and single-purpose
summary: "Keep one abstraction level, prefer zero to two arguments, avoid flag arguments and hidden side effects, and extract named steps."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: Writing or refactoring functions and methods.
conditions_does_not_apply_when: Generated code or callbacks whose signature is fixed by a framework.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each function has one purpose and a clear level of abstraction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L57-L82"
status: active
revision: 1
---

# Keep functions small and single-purpose

Keep functions small, single-purpose and at one abstraction level; prefer zero to two arguments and justify three or more. Avoid flag arguments and hidden side effects, separate state changes from returned queries, structure code top-down, and extract named steps where useful.
