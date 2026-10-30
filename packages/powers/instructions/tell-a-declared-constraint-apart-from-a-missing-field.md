---
instruction_id: tell-a-declared-constraint-apart-from-a-missing-field
title: Tell a declared constraint apart from a missing field
summary: A published bound is honoured and never re-probed; a lookup that failed is not an observation at all.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - evidence-analysis
conditions_applies_when: A compatibility claim is read before anything is done about it.
conditions_does_not_apply_when: The bound has already been verified by a probe.
artifact_contract_output_type: compatibility-case-classification
artifact_contract_required_data:
  - the case the claim falls into
  - the action each case calls for
artifact_contract_verified_by: the case is named before any probe is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell a declared constraint apart from a missing field
The rule targets metadata that is **missing**, never metadata that is merely **unfavorable** — so a declared upper bound is not weakened by any of this, and re-probing against it is wasted work.
| **The lookup itself failed** — registry 5xx, package not found, tool errored | *No observation.* This is not the same as "no field declared" | Retry the lookup first. Do not treat a failed lookup as evidence of anything |
