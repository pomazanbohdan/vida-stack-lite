---
instruction_id: keep-one-idea-per-key-and-never-mix-requirements
title: Keep one idea per key and never mix requirements
summary: "Every piece of work carries one stable key; a continuation reuses its key, a new idea mints a new one, and the requirements of one idea never leak into another."
capability_tags:
  - model-domain-language
pattern_tags:
  - stable-identity
conditions_applies_when: Work is indexed under keys so that it can be found again later.
conditions_does_not_apply_when: The work is a one-off that will never be continued.
artifact_contract_output_type: keyed-requirements
artifact_contract_required_data:
  - the key
  - the idea it stands for
  - the requirements listed under it
artifact_contract_verified_by: "each key stands for exactly one idea and carries only that idea's requirements"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Keep one idea per key and never mix requirements
Reuse the exact same idea key for every spike in this session and any later session that continues the same idea.
Only mint a new idea key when the current idea is not a continuation of one already indexed in MANIFEST.md — never reuse an existing idea key for an unrelated idea, and never merge two different ideas under one key.
Never copy or merge requirements from a different idea key into this list.
When the user expresses a preference during spiking, add it to the current idea's Requirements list immediately — never to a different idea's list.
