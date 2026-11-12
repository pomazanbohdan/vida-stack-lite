---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-interface-context-md-eb2f1e41-c01"
title: "gsd-core: gsd-core/references/planner-interface-context.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-interface-context.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-interface-context.md\"}"
atom_ids:
  - embed-the-contracts-the-implementer-needs
  - hand-the-executor-the-interfaces-it-would-otherwise-hunt-for
atom_count: 2
atoms: "[{\"atom_id\":\"embed-the-contracts-the-implementer-needs\",\"file_sha256\":\"31d6189c2120d753aa655ffadd949dd9dd1aa113bb6ee4c47d6a4c3b289cb05a\",\"content_sha256\":\"293b389fe40872522eb86b22a625e24ae4f3d920955413c1e215d1cb7c0afcf9\",\"file_bytes\":2332,\"body_bytes\":1139},{\"atom_id\":\"hand-the-executor-the-interfaces-it-would-otherwise-hunt-for\",\"file_sha256\":\"cd2197d175db939e476b60f96942ba2b2e824cef19ec3697cbf7f94362649712\",\"content_sha256\":\"756fa8aa38e388aa415fa0449571b01a329a85444822731847d19ce4d9056763\",\"file_bytes\":1830,\"body_bytes\":643}]"
carrier_sha256: 1ee0407e3530ac72633138991ae3ce935646871d1a4773f365b8f0b3b97fd811
carrier_bytes: 4479
revision: 1
status: active
---
<!-- vpmodule:atom:begin embed-the-contracts-the-implementer-needs -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-interface-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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
<!-- vpmodule:atom:end embed-the-contracts-the-implementer-needs -->
<!-- vpmodule:atom:begin hand-the-executor-the-interfaces-it-would-otherwise-hunt-for -->
---
instruction_id: hand-the-executor-the-interfaces-it-would-otherwise-hunt-for
title: Hand the executor the interfaces it would otherwise hunt for
summary: "The key types and exports the executor needs are embedded in the plan, so it never explores the codebase to find them."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: A plan depends on existing code or creates interfaces other plans consume.
conditions_does_not_apply_when: "The plan is self-contained, is pure configuration, or every pattern is already established."
artifact_contract_output_type: interfaces-block
artifact_contract_required_data:
  - the interfaces the executor needs
  - the file each came from
artifact_contract_verified_by: the plan carries the interfaces and the executor needs no codebase exploration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-interface-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Hand the executor the interfaces it would otherwise hunt for
After determining `files_modified`, extract the key interfaces/types/exports from the codebase that executors will need
Embed these in the plan's `<context>` section as an `<interfaces>` block
Executor should use these directly — no codebase exploration needed
- Plan touches files that import from other modules → extract those module's exports
- Plan creates a new API endpoint → extract the request/response types
- Plan modifies a component → extract its props interface
- Plan depends on a previous plan's output → extract the types from that plan's files_modified
<!-- vpmodule:atom:end hand-the-executor-the-interfaces-it-would-otherwise-hunt-for -->