---
instruction_id: couple-plans-that-share-a-mutable-resource
title: Couple plans that share a mutable resource
summary: Two plans in the same wave that write the same mutable resource are coupled even when no file overlaps.
capability_tags:
  - plan-implementation
pattern_tags:
  - state-modeling
conditions_applies_when: Two plans are placed in the same wave.
conditions_does_not_apply_when: The plans touch disjoint files and disjoint resources.
artifact_contract_output_type: wave-coupling
artifact_contract_required_data:
  - the shared mutable resource
  - the coupling resolution
  - the dependency or the justification
artifact_contract_verified_by: the pair is either ordered or explicitly justified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-coupling.md
status: active
revision: 1
---

# Couple plans that share a mutable resource
`files_modified`/`files_deleted` overlap is not the only coupling between same-wave plans. If two plans in the same wave touch the same **mutable resource** through their task actions — a config key, DB table/row, migration, env var, singleton, cache — with at least one writer, or one plan produces a prerequisite the other consumes, the pair is coupled through shared state even though no file overlaps: under parallel execution the outcome depends on which executor gets there first
Resolve it one of three ways, in order of preference:
1. **Declare the edge** — add the producing plan to the consumer's `depends_on`. Wave assignment then orders them automatically
2. **Re-wave** — move one plan to a later wave when the dependency direction is unclear but an ordering is still wanted
3. **Justify the pair** — when the coupling is deliberate and genuinely order-independent (both orders produce a correct result), record it in either plan's frontmatter, one `"plan-id: reason"` entry per coupled peer
