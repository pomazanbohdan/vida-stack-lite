---
instruction_id: generate-independent-hypotheses-before-investigating-one
title: Generate independent hypotheses before you investigate one
summary: "Several independent hypotheses are generated before the first one is investigated, and disconfirming evidence is sought actively."
capability_tags:
  - debug-root-cause
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A failure is about to be investigated.
conditions_does_not_apply_when: The cause is already confirmed by evidence.
artifact_contract_output_type: hypothesis-set
artifact_contract_required_data:
  - the independent hypotheses
  - the disconfirming evidence sought
  - the hypothesis that survived
artifact_contract_verified_by: more than one independent hypothesis was generated before the investigation started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Generate independent hypotheses before you investigate one
Actively seek disconfirming evidence. "What would prove me wrong?"
Generate 3+ independent hypotheses before investigating any
Treat each bug as novel until evidence suggests otherwise
Every 30 min: "If I started fresh, is this still the path I'd take?"
Embrace not knowing: "I don't know why this fails" = good (now you can investigate). "It must be X" = dangerous (you've stopped thinking).
