---
instruction_id: ban-the-hand-rolled-containment-comparison
title: Ban the hand-rolled containment comparison
summary: "The hand-rolled path comparison is banned by a check, and a site that cannot use the predicate carries a written reason that the check accepts; an empty reason is refused."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A check that forbids the hand-rolled comparison is being added or its exemptions are being reviewed.
conditions_does_not_apply_when: The project has no such check and none is planned.
artifact_contract_output_type: containment-rule
artifact_contract_required_data:
  - the banned comparison
  - the exemption marker
  - the reason that is mandatory
artifact_contract_verified_by: the hand-rolled comparison is banned and every exemption carries a non-empty reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ban the hand-rolled containment comparison
- It bans the hand-rolled comparison `X.startsWith(Y + separator)` and a containment predicate called as a bare statement with its answer discarded.
- The reason is mandatory and reviewable; the rule does not accept an empty one.
