---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-compose-methods
title: Compose methods into intention-revealing steps
summary: "Extract meaningful blocks, inline needless indirection and split temporaries or method objects when the code calls for it."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A method is too long, unclear or carries temporary state."
conditions_does_not_apply_when: A method that is already small and intention-revealing.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The resulting methods reveal intention and remove indirection that added no value.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L57-L80"
status: active
revision: 1
---

# Compose methods into intention-revealing steps

Compose methods into smaller, intention-revealing steps. Prefer Extract Method for meaningful blocks; inline methods or variables when indirection adds no value or a temporary is used once; use query, split-temporary, or method-object transformations under the stated conditions.
