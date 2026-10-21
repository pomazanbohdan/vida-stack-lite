---
instruction_id: treat-an-instruction-surface-as-a-code-execution-surface
title: Treat an instruction surface as a code-execution surface
summary: "An instruction that reaches the agent is classified as a surface that runs, because it decides what the thing that does run will do; classifying it as inert picks the wrong property."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - threat-modeling
conditions_applies_when: A surface that only carries prose is about to be classified for consent.
conditions_does_not_apply_when: The surface is an inert artifact that the agent never reads.
artifact_contract_output_type: surface-classification
artifact_contract_required_data:
  - the surface that carries instructions
  - the property the classification is based on
  - the consent that follows
artifact_contract_verified_by: the instruction surface is classified as a running surface and the consent follows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-trust-model.md
status: active
revision: 1
---

# Treat an instruction surface as a code-execution surface
- That reasoning was wrong, and the correction matters more than the wording: a skill body does not execute code, it **instructs the thing that does**.
- The consent path was chosen on a property ("does not execute code") that is true and not the relevant one.
