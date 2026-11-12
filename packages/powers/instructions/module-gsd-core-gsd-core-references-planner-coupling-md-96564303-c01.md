---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-coupling-md-96564303-c01"
title: "gsd-core: gsd-core/references/planner-coupling.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-coupling.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-coupling.md\"}"
atom_ids:
  - couple-plans-that-share-a-mutable-resource
  - treat-shared-mutable-state-as-a-coupling
atom_count: 2
atoms: "[{\"atom_id\":\"couple-plans-that-share-a-mutable-resource\",\"file_sha256\":\"e77ecb6c0efa62de4023d48e6fa13b27f599abe3e44cec117c3c4345783321c7\",\"content_sha256\":\"f00208aaa320661d88dc37e4b0080ed9cb8445216e8232341fc703790c038db3\",\"file_bytes\":2131,\"body_bytes\":1060},{\"atom_id\":\"treat-shared-mutable-state-as-a-coupling\",\"file_sha256\":\"5e3709caafae9b24429f4e04ef975c60c94f0545a7d936a3d887c6ea78124d5b\",\"content_sha256\":\"4db48295fd6ef0ccdacb90b3244fef30bf184748833e91978da11305a9ae543a\",\"file_bytes\":2549,\"body_bytes\":1233}]"
carrier_sha256: a3fa74e0ee21eda14ee1eef6f9e973b3e998bcebbf46f367790b223c46d87410
carrier_bytes: 4959
revision: 1
status: active
---
<!-- vpmodule:atom:begin couple-plans-that-share-a-mutable-resource -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-coupling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Couple plans that share a mutable resource
`files_modified`/`files_deleted` overlap is not the only coupling between same-wave plans. If two plans in the same wave touch the same **mutable resource** through their task actions — a config key, DB table/row, migration, env var, singleton, cache — with at least one writer, or one plan produces a prerequisite the other consumes, the pair is coupled through shared state even though no file overlaps: under parallel execution the outcome depends on which executor gets there first
Resolve it one of three ways, in order of preference:
1. **Declare the edge** — add the producing plan to the consumer's `depends_on`. Wave assignment then orders them automatically
2. **Re-wave** — move one plan to a later wave when the dependency direction is unclear but an ordering is still wanted
3. **Justify the pair** — when the coupling is deliberate and genuinely order-independent (both orders produce a correct result), record it in either plan's frontmatter, one `"plan-id: reason"` entry per coupled peer
<!-- vpmodule:atom:end couple-plans-that-share-a-mutable-resource -->
<!-- vpmodule:atom:begin treat-shared-mutable-state-as-a-coupling -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-coupling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat shared mutable state as a coupling
`files_modified`/`files_deleted` overlap is not the only coupling between same-wave plans. If two plans in the same wave touch the same **mutable resource** through their task actions - a config key, DB table/row, migration, env var, singleton, cache - with at least one writer, or one plan produces a prerequisite the other consumes, the pair is coupled through shared state even though no file overlaps: under parallel execution the outcome depends on which executor gets there first.
Resolve it one of three ways, in order of preference:
1. **Declare the edge** - add the producing plan to the consumer's `depends_on`. Wave assignment then orders them automatically.
2. **Re-wave** - move one plan to a later wave when the dependency direction is unclear but an ordering is still wanted.
3. **Justify the pair** - when the coupling is deliberate and genuinely order-independent (both orders produce a correct result), record it in either plan's frontmatter, one `"plan-id: reason"` entry per coupled peer:
Declaring the edge, re-waving, or justifying the pair at plan time means the first checker pass comes back clean instead of surfacing an advisory the planner then has to interpret.
<!-- vpmodule:atom:end treat-shared-mutable-state-as-a-coupling -->