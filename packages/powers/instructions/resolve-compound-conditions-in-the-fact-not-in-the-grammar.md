---
instruction_id: resolve-compound-conditions-in-the-fact-not-in-the-grammar
title: "Resolve compound conditions in the fact, not in the grammar"
summary: A condition that is really a disjunction is reduced to one boolean before it reaches the grammar; the grammar itself never grows an operator.
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: A condition has several triggers that are combined before it is evaluated.
conditions_does_not_apply_when: The condition has exactly one trigger.
artifact_contract_output_type: fact-computed-condition
artifact_contract_required_data:
  - the triggers that are combined
  - the one boolean they are reduced to
  - the grammar that stays operator-free
artifact_contract_verified_by: the compound condition was reduced to one boolean and the grammar was left alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/workflow-fragments.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Resolve compound conditions in the fact, not in the grammar
- **compounding belongs in fact computation (`src/init.cts`), never in the `when=` grammar (`src/workflow-fragments.cts` / `src/section-manifest.cts`).**
- A condition that cannot be reduced to one boolean fact computed ahead of evaluation is not eligible to become an atom
