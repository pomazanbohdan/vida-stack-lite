---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-smell-refactoring
title: Use code smells as refactoring clues
summary: "Treat smells as clues, refactor in small tested steps and do not combine refactoring with feature work."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Refactoring code with test coverage and identifiable smells.
conditions_does_not_apply_when: "Feature work, or refactoring without tests; use the legacy-code instruction."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each refactoring step preserves behavior and keeps tests green.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L156-L180"
status: active
revision: 1
---

# Use code smells as refactoring clues

Treat code smells as clues to design problems and use targeted refactoring. Address function, general and test smells; refactor in small tested steps and do not combine refactoring with feature work; leave code cleaner than found.
