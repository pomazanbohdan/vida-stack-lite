---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-move-features
title: Move features to the object that owns the data
summary: "Move methods or fields toward their data, balance extract versus inline class, and resolve delegate or middle-man tradeoffs case by case."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "A method or field belongs with another object's data or behavior."
conditions_does_not_apply_when: A deliberate boundary fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The moved feature sits with the data and behavior it depends on, without unnecessary delegation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L81-L103"
status: active
revision: 1
---

# Move features to the object that owns the data

Move a method or field when it belongs with another object's data or behavior; extract or inline classes according to responsibility balance. Hide delegates for unstable chains and remove a middle man when it only forwards calls; resolve the tradeoff case by case.
