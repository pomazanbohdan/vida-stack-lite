---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-claude-commands-spec-md-dec31ee0-c01"
title: "addy-skills: .claude/commands/spec.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:.claude/commands/spec.md."
source: "{\"donor\":\"addy-skills\",\"path\":\".claude/commands/spec.md\"}"
atom_ids:
  - elicit-the-goal-users-and-boundaries-before-writing-the-spec
  - map-the-capabilities-before-specing-modules
  - write-the-spec-over-six-areas
atom_count: 3
atoms: "[{\"atom_id\":\"elicit-the-goal-users-and-boundaries-before-writing-the-spec\",\"file_sha256\":\"b784675228bd1f00d30a965518468e14c14ead7805f28e9fb6ff40004a409fce\",\"content_sha256\":\"00402789e54e79ebebc7ce0455080fca1c0699970e41361e089372c748dfa494\",\"file_bytes\":3150,\"body_bytes\":1400},{\"atom_id\":\"map-the-capabilities-before-specing-modules\",\"file_sha256\":\"c1be337a9b9344aa255722bba00d0c54b6b9ba1f7d415c0edc503b2e1c43e6ba\",\"content_sha256\":\"6f75d6f262a3feafaa4de4521a22a7c00ad1e3eb0f01669d0a51714afa359a17\",\"file_bytes\":1411,\"body_bytes\":261},{\"atom_id\":\"write-the-spec-over-six-areas\",\"file_sha256\":\"3e9e2df93aced14912d94094bbac1dfbfe0b8e6e5bcf88e2a087cf8f2298590f\",\"content_sha256\":\"33a2769920ee12392c84ebfaa6985fb80a6f3dd7b2d6922e977571d2623d34f8\",\"file_bytes\":1457,\"body_bytes\":269}]"
carrier_sha256: 2ae4ffa0e0327a9ff6c957d27936818596dcdb54fc6e666b27a64c81afab080e
carrier_bytes: 6455
revision: 1
status: active
---
<!-- vpmodule:atom:begin elicit-the-goal-users-and-boundaries-before-writing-the-spec -->
---
instruction_id: elicit-the-goal-users-and-boundaries-before-writing-the-spec
title: "Elicit the goal, the users and the boundaries before writing the spec"
summary: "The spec starts from four questions: the objective and target users, the core features and acceptance criteria, the stack preferences and constraints, and the boundaries."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The request is a new capability and the spec does not exist yet.
conditions_does_not_apply_when: The conversation already contains what the spec must say.
artifact_contract_output_type: clarification-set
artifact_contract_required_data:
  - the objective and target users
  - the core features and acceptance criteria
  - the stack preferences and constraints
  - the boundaries
artifact_contract_verified_by: each of the four areas has an answer before the spec is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/spec.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/first-breath-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/first-breath-config-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/BOND-template.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Elicit the goal, the users and the boundaries before writing the spec
Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)
Ask one thing, then listen.
Begin with easy, low-stakes questions — the kind that need zero preparation.
Depth should emerge naturally from your curiosity about their answers, not from demanding introspection upfront.
Never ask the user what communication style they prefer. Instead, listen to how they actually talk and become fluent in it.
Match their register, their rhythm, their vocabulary.
Every few exchanges, offer the user an honest read on what you're picking up. Not compliments — observations.
Give them something concrete to push back on. Correction teaches you faster than more questions ever will.
If the user sidesteps a topic, deflects, or waves something off — respect it completely, but register it quietly. Boundaries are data.
Note what was avoided without commentary.
Have a conversation. Not an interrogation — a conversation.
Be warm but not sycophantic. Be curious but not interrogating.
Work through these naturally. Don't fire them off as a list — weave them into conversation. Skip any that get answered organically.
<!-- vpmodule:atom:end elicit-the-goal-users-and-boundaries-before-writing-the-spec -->
<!-- vpmodule:atom:begin map-the-capabilities-before-specing-modules -->
---
instruction_id: map-the-capabilities-before-specing-modules
title: Map the capabilities before specing the modules
summary: "A request that bundles several independently testable capabilities gets an approved capability map first — module ids, dependency direction and build order — and each module is speced in dependency order."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: The request bundles several independently testable capabilities.
conditions_does_not_apply_when: The request is one capability.
artifact_contract_output_type: capability-map
artifact_contract_required_data:
  - the module ids
  - the dependency direction
  - the build order
  - the approval
artifact_contract_verified_by: the map is approved before any module is speced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Map the capabilities before specing the modules
If the request bundles several independently testable capabilities, first propose a capability map (module ids, dependency direction, build order)
and get it approved, then spec each module in dependency order.
<!-- vpmodule:atom:end map-the-capabilities-before-specing-modules -->
<!-- vpmodule:atom:begin write-the-spec-over-six-areas -->
---
instruction_id: write-the-spec-over-six-areas
title: Write the spec over six areas
summary: "The spec covers objective, commands, project structure, code style, testing strategy and boundaries, is saved at the project root, and is confirmed with the user before anything follows."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A structured spec is written for a project.
conditions_does_not_apply_when: The six areas are already fixed by an existing document.
artifact_contract_output_type: spec
artifact_contract_required_data:
  - objective
  - commands
  - project structure
  - code style
  - testing strategy
  - boundaries
artifact_contract_verified_by: the spec covers all six areas and the user confirmed it
compatibility_excludes: []
compatibility_requires:
  - elicit-the-goal-users-and-boundaries-before-writing-the-spec
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Write the spec over six areas
Then generate a structured spec covering all six core areas: objective, commands, project structure, code style, testing strategy, and boundaries.
Save the spec as SPEC.md in the project root and confirm with the user before proceeding.
<!-- vpmodule:atom:end write-the-spec-over-six-areas -->