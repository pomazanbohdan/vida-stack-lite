---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-simplify-conditionals
title: Simplify conditional logic
summary: "Use named conditions, guard clauses, consolidated branches and polymorphism; reserve Special Case and assertions for their stated purposes."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Nested or type-based conditionals obscure intent.
conditions_does_not_apply_when: A conditional already expressed as a clear domain rule.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The conditional structure states its intent and preserves behavior.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L128-L151"
status: active
revision: 1
---

# Simplify conditional logic

Simplify nested conditionals using named condition and branch methods, consolidate conditions with the same result, use guard clauses for edge cases, and replace type-based conditionals with polymorphism where appropriate. Special Case can remove repeated null checks; assertions make assumptions fail fast.
