---
instruction_id: keep-a-closed-vocabulary-instead-of-growing-a-grammar
title: Keep a closed vocabulary instead of growing a grammar
summary: "A condition vocabulary stays a closed list of single atoms: widening it is a deliberate change to the specification, never an edit that adds an operator one case at a time."
capability_tags:
  - harden-validation
pattern_tags:
  - state-modeling
conditions_applies_when: A new condition may be added to the vocabulary.
conditions_does_not_apply_when: The vocabulary has no conditions and none are planned.
artifact_contract_output_type: closed-vocabulary
artifact_contract_required_data:
  - the closed list of conditions
  - the rule that keeps it operator-free
  - how the list is widened
artifact_contract_verified_by: the vocabulary stayed closed and any widening was a deliberate change
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

# Keep a closed vocabulary instead of growing a grammar
- This list is **closed by design** (Greenspun's Tenth Rule): left open-ended, `when=` would acquire boolean operators, negation, precedence, and runtime/capability predicates one edit at a time, becoming an ad-hoc, informally-specified applicability language.
- `when=` remains exactly one atom per marker: no operators, no negation, no nesting, regardless of how many atoms the frozen list holds.
