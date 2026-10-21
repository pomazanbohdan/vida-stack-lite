---
instruction_id: treat-shared-mutable-state-as-a-coupling
title: Treat shared mutable state as a coupling
summary: "Two plans that run in the same wave are coupled when they touch the same mutable resource or when one produces what the other consumes, even if no file overlaps; the coupling is declared, re-waved or justified."
capability_tags:
  - coordinate-program
pattern_tags:
  - parallel-execution
conditions_applies_when: Plans are assigned to waves that will run at the same time.
conditions_does_not_apply_when: The plans run one after the other.
artifact_contract_output_type: coupling-decision
artifact_contract_required_data:
  - the shared mutable resource or the produced-consumed edge
  - "the resolution: declared edge, re-wave, or justified pair"
  - the reason recorded for a justified pair
artifact_contract_verified_by: "every same-wave pair that shares mutable state carries a declared edge, a later wave, or a recorded justification"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-coupling.md
status: active
revision: 1
---

# Treat shared mutable state as a coupling
`files_modified`/`files_deleted` overlap is not the only coupling between same-wave plans. If two plans in the same wave touch the same **mutable resource** through their task actions - a config key, DB table/row, migration, env var, singleton, cache - with at least one writer, or one plan produces a prerequisite the other consumes, the pair is coupled through shared state even though no file overlaps: under parallel execution the outcome depends on which executor gets there first.
Resolve it one of three ways, in order of preference:
1. **Declare the edge** - add the producing plan to the consumer's `depends_on`. Wave assignment then orders them automatically.
2. **Re-wave** - move one plan to a later wave when the dependency direction is unclear but an ordering is still wanted.
3. **Justify the pair** - when the coupling is deliberate and genuinely order-independent (both orders produce a correct result), record it in either plan's frontmatter, one `"plan-id: reason"` entry per coupled peer:
Declaring the edge, re-waving, or justifying the pair at plan time means the first checker pass comes back clean instead of surfacing an advisory the planner then has to interpret.
