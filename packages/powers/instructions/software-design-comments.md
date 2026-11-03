---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-comments
title: Use comments to record design intent
summary: "Explain non-obvious intent, abstraction rationale, invariants and assumptions near the code, and update comments with the code."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - technical-writing
conditions_applies_when: Documenting non-obvious code or reviewing whether comments are needed.
conditions_does_not_apply_when: A comment that merely restates the code.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Comments explain design intent or invariants that the code cannot express, and they remain current with the code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L120-L142"
status: active
revision: 1
---

# Use comments to record design intent

Use comments to explain non-obvious design intent, abstraction rationale, invariants and assumptions rather than restating code. Keep comments near the code and update them with it; consider hard-to-write comments a signal that design may be too complex.
