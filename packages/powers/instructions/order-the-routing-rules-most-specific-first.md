---
instruction_id: order-the-routing-rules-most-specific-first
title: Order the routing rules most-specific first
summary: The first matching rule decides the route; a generic keyword never preempts a specific operation.
capability_tags:
  - coordinate-program
pattern_tags:
  - scope-routing
conditions_applies_when: A freeform request matches more than one rule of a routing table.
conditions_does_not_apply_when: Exactly one rule matches and no generic rule also matches.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the matched rule
  - the reason it wins
artifact_contract_verified_by: the first matching rule decided the route and a generic rule did not preempt a specific one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/do.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Order the routing rules most-specific first
Rules are ordered **most-specific first**: apply the **first matching** rule, and never let a generic keyword rule ("set up", "spike", "review") preempt a more specific operation that also matches ("set up this existing codebase", "wrap up the spike findings", "review the changed source code").
