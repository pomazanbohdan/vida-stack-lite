---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-refactoring-patterns-skill-md-80f7a952-c02"
title: "wondelai-skills: skills/refactoring-patterns/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/refactoring-patterns/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/refactoring-patterns/SKILL.md\"}"
atom_ids:
  - refactoring-simplify-conditionals
  - refactoring-small-behavior-preserving-steps
atom_count: 2
atoms: "[{\"atom_id\":\"refactoring-simplify-conditionals\",\"file_sha256\":\"cf5f5da7137a9df97fa86ef8ef947044c4e84c436e6c70c50df60f706655ee1b\",\"content_sha256\":\"64e07d70ba64a6e9a8cc459d41b972d4fc1fb592a0efcfafc2c6b79640bf2ef8\",\"file_bytes\":1469,\"body_bytes\":338},{\"atom_id\":\"refactoring-small-behavior-preserving-steps\",\"file_sha256\":\"af698d9e83ed3c4eb63d5d1c2478d97beb84fd3fd90cac315610b456f83ccd47\",\"content_sha256\":\"0f8f16f882b07cae9c1cdb8d9bd1a2dbe3511aed8dddbef922f5bc933add3551\",\"file_bytes\":1530,\"body_bytes\":377}]"
carrier_sha256: acebff98c799f874da0ae10dc735ef7e2b5a2cbb9f00ca4ad0c105b7f2b112ff
carrier_bytes: 3266
revision: 1
status: active
---
<!-- vpmodule:atom:begin refactoring-simplify-conditionals -->
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
<!-- vpmodule:atom:end refactoring-simplify-conditionals -->
<!-- vpmodule:atom:begin refactoring-small-behavior-preserving-steps -->
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
<!-- vpmodule:atom:end refactoring-small-behavior-preserving-steps -->