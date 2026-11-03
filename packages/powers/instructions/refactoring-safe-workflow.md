---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-safe-workflow
title: Follow the safe refactoring workflow
summary: "Run tests green, make one small transformation, rerun tests and commit; revert a red step, and use Branch by Abstraction or Parallel Change for large changes."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Performing a refactoring in production code.
conditions_does_not_apply_when: A throwaway prototype or code that will be deleted.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each small step has a green test result and a commit, and a red step is reverted rather than debugged in place."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L152-L175"
status: active
revision: 1
---

# Follow the safe refactoring workflow

For safe refactoring, run tests green, make one small structural transformation, rerun tests, and commit; if tests turn red, revert rather than debug a broken refactoring. Apply the Rule of Three, preparatory and comprehension refactoring as described; do not refactor when rewriting is easier, tests cannot feasibly be added, or deletion is near. Optimize only after clarity and profiling, and use Branch by Abstraction or Parallel Change for large production changes.
