---
instruction_id: allow-exactly-one-check-shape-per-gate
title: Allow exactly one check shape per gate
summary: "A gate carries exactly one of the declared check shapes, and the validator refuses a gate that carries none or several."
capability_tags:
  - make-states-unrepresentable
pattern_tags:
  - state-modeling
conditions_applies_when: A gate is being declared.
conditions_does_not_apply_when: The gate does not carry a check at all.
artifact_contract_output_type: single-check-shape
artifact_contract_required_data:
  - the check shape the gate carries
  - the validator that refuses the others
  - what an ambiguous gate would mean
artifact_contract_verified_by: the gate carries exactly one declared check shape
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gate-predicates.md
status: active
revision: 1
---

# Allow exactly one check shape per gate
- A capability gate's `check` block carries exactly one of three shapes (`query`, `predicate`, `agentVerdict`), enforced by the registry validator
