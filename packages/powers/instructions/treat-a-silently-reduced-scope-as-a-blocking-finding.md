---
instruction_id: treat-a-silently-reduced-scope-as-a-blocking-finding
title: Treat a silently reduced scope as a blocking finding
summary: "A plan that names the decision but delivers a fraction of it is a blocking finding, not a warning."
capability_tags:
  - plan-implementation
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A plan is checked against a decision the user made.
conditions_does_not_apply_when: The plan delivers the decision in full.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the decision
  - the delivered scope
artifact_contract_verified_by: the reduced scope is reported as blocking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-plan-checker.md
status: active
revision: 1
---

# Treat a silently reduced scope as a blocking finding
Critical
This is the most insidious failure mode: Plans reference D-XX but deliver only a fraction of what the user decided.
Scope reduction is never a Minor finding — it means the user's decision will not be delivered.
Treating scope reduction ("v1", "static for now", "future enhancement") as acceptable when the user's decision demands full delivery
