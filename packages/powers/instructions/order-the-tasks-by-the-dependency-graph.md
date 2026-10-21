---
instruction_id: order-the-tasks-by-the-dependency-graph
title: Order the tasks by the dependency graph
summary: "Map what depends on what and implement bottom-up, foundations first."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work breaks into tasks that depend on each other.
conditions_does_not_apply_when: The tasks are independent of each other.
artifact_contract_output_type: dependency-order
artifact_contract_required_data:
  - the dependency graph
  - the resulting order
artifact_contract_verified_by: "each task's dependencies appear earlier in the order"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/analyze-dependencies.md
status: active
revision: 2
---

# Order the tasks by the dependency graph

Map what depends on what.
Implementation order follows the dependency graph bottom-up: build foundations first.
If two items will both modify files in the same domain or the same specific files, one must run before the other. The one that provides the foundation runs first.
Item B mentions consuming, using, or calling something that item A creates/implements.
Item A creates data structures, schemas, or types -> item B consumes or transforms them.
For item pairs with no detected dependency, state that no dependency was detected.
