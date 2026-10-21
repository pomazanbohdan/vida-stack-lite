---
instruction_id: embed-the-contracts-the-implementer-needs
title: Embed the contracts the implementer needs
summary: "The types, interfaces and exports the implementer needs are written into the plan, so the executor works from the contracts instead of hunting the codebase for them."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan depends on existing code or creates interfaces other work consumes.
conditions_does_not_apply_when: The plan is self-contained and imports nothing.
artifact_contract_output_type: embedded-interfaces
artifact_contract_required_data:
  - "the interfaces, types and exports the executor needs"
  - the source they were taken from
artifact_contract_verified_by: the executor needs no codebase exploration to find the contracts it works against
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-interface-context.md
status: active
revision: 1
---

# Embed the contracts the implementer needs
**Key insight:** "The difference between handing a contractor blueprints versus telling them 'build me a house.'"
When creating plans that depend on existing code or create new interfaces consumed by other plans:
Embed these in the plan's `<context>` section as an `<interfaces>` block:
<!-- Key types and contracts the executor needs. Extracted from codebase. -->
<!-- Executor should use these directly - no codebase exploration needed. -->
**When to include interfaces:**
- Plan touches files that import from other modules → extract those module's exports
- Plan creates a new API endpoint → extract the request/response types
- Plan modifies a component → extract its props interface
- Plan depends on a previous plan's output → extract the types from that plan's files_modified
**When to skip:**
- Plan is self-contained (creates everything from scratch, no imports)
- Plan is pure configuration (no code interfaces involved)
- Level 0 discovery (all patterns already established)
If this plan creates types/interfaces that later plans depend on, include a "Wave 0" skeleton step:
