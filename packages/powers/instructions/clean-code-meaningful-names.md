---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-meaningful-names
title: Use meaningful names
summary: "Name by intent, avoid disinformation and encodings, and make names more descriptive as scope grows."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: "Naming modules, classes, functions, variables or tests."
conditions_does_not_apply_when: Names fixed by an external API or language convention that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A reader can infer intent from the name without a comment.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L32-L56"
status: active
revision: 1
---

# Use meaningful names

Choose names that reveal intent and avoid disinformation; do not rely on comments to explain a name. Use consistent terminology, omit type encodings and prefixes, use single letters only for tiny-scope loop counters, name classes as nouns and methods as verbs, and use more descriptive names for wider scopes.
