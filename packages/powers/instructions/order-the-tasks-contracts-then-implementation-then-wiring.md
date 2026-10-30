---
instruction_id: order-the-tasks-contracts-then-implementation-then-wiring
title: "Order the tasks: contracts, then implementation, then wiring"
summary: "When a plan creates interfaces that later tasks consume, the contracts come first, the implementation second and the wiring last."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: A plan creates interfaces that later tasks consume.
conditions_does_not_apply_when: The plan creates no interface other tasks depend on.
artifact_contract_output_type: task-order
artifact_contract_required_data:
  - the contract task
  - the implementation tasks
  - the wiring task
artifact_contract_verified_by: the contract task comes before every task that implements against it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Order the tasks: contracts, then implementation, then wiring
When a plan creates new interfaces consumed by subsequent tasks:
1. **First task: Define contracts** — Create type files, interfaces, exports
2. **Middle tasks: Implement** — Build against the defined contracts
3. **Last task: Wire** — Connect implementations to consumers
This prevents the "scavenger hunt" anti-pattern where executors explore the codebase to understand contracts. They receive the contracts in the plan itself
