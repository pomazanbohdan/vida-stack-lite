---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-guidance-md-57e5b123-c01"
title: "gsd-core: gsd-core/references/planner-guidance.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/references/planner-guidance.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-guidance.md\"}"
atom_ids:
  - complete-on-the-artifact-when-nothing-consumes-a-marker
  - derive-the-truths-the-artifacts-the-wiring-and-the-key-links
  - give-every-parallel-unit-exclusive-file-ownership
  - order-the-tasks-contracts-then-implementation-then-wiring
  - prefer-vertical-slices-over-horizontal-layers
  - size-a-task-by-the-context-it-consumes
  - size-the-task-by-its-context-cost
  - strip-the-enterprise-ceremony-from-the-plan
atom_count: 8
atoms: "[{\"atom_id\":\"complete-on-the-artifact-when-nothing-consumes-a-marker\",\"file_sha256\":\"5e7f01bbfc0a95d50c6d8608e83a77aa2ba55d91801e90bece968a6252c77b17\",\"content_sha256\":\"b727e06666f90984a61c8df35d80fbc6af29a6cf2095ba433c44b5f373dedb39\",\"file_bytes\":1506,\"body_bytes\":405},{\"atom_id\":\"derive-the-truths-the-artifacts-the-wiring-and-the-key-links\",\"file_sha256\":\"58a9b39b9cfc810e37b28e2866f753d62a6e26673dd95e7cbfca7ed232e3b98a\",\"content_sha256\":\"55718a866d3ee5517a541d5038c0ad76b8db263ee38dfd894ef1cdb82ad4ba3c\",\"file_bytes\":1589,\"body_bytes\":447},{\"atom_id\":\"give-every-parallel-unit-exclusive-file-ownership\",\"file_sha256\":\"9c350ee8a3f4a459c0aac8918eff48c59a6b0ac37cfff0559b8c5263b72d4724\",\"content_sha256\":\"fe50dc7c67190a34603d4e2431affe2e7402d9e18a978406fb57ed30f92f0b67\",\"file_bytes\":1323,\"body_bytes\":186},{\"atom_id\":\"order-the-tasks-contracts-then-implementation-then-wiring\",\"file_sha256\":\"9838b367d0514f6f2d774745d5147dc1da9f05c561c1be32e5438f0620f96279\",\"content_sha256\":\"5835d391c4522fba5364c85200f2014533a5110db3dc150c6b66f95631939f9b\",\"file_bytes\":1611,\"body_bytes\":498},{\"atom_id\":\"prefer-vertical-slices-over-horizontal-layers\",\"file_sha256\":\"3fac373f996eaa48ef963d01cae13fbf252408a810593f2a58e8e2621504a2b0\",\"content_sha256\":\"b9f0938f1781e1ae91a5599170eda38b5774fc7cd6b6e4b71c3c9347bb4d3b76\",\"file_bytes\":1345,\"body_bytes\":267},{\"atom_id\":\"size-a-task-by-the-context-it-consumes\",\"file_sha256\":\"8df9ec3a7e02f4a23c1b68f720292b338f1fbc9ad0b3c7289e84ef8c7095eaf5\",\"content_sha256\":\"da89a834e8ab81b4d312eb4d35c07f324d555a5178308c0db8f2dd3c5767e4d1\",\"file_bytes\":2019,\"body_bytes\":892},{\"atom_id\":\"size-the-task-by-its-context-cost\",\"file_sha256\":\"b6bee864d00dfd15fdd6e0d9b15db63153da3db4c656441fa508af7f70d6ef54\",\"content_sha256\":\"f1cdae481bc757bd6e4548b16d1c31a5081fc6d642f7b06b21fbd2cc3a6e47e0\",\"file_bytes\":1655,\"body_bytes\":614},{\"atom_id\":\"strip-the-enterprise-ceremony-from-the-plan\",\"file_sha256\":\"e3321680762052ccbe24be6f5bfee88373eb65369a5c00923ba9944b5fef6f73\",\"content_sha256\":\"3afe96cb877a5e24abaa617ec870d8960be4ea4ddfa510753346a3a8a84d42ed\",\"file_bytes\":1335,\"body_bytes\":260}]"
carrier_sha256: 7ec6497d0bf0eea3f3e20dfd450cc6933629075b5de6374642de8897645e71ed
carrier_bytes: 13606
revision: 1
status: active
---
<!-- vpmodule:atom:begin complete-on-the-artifact-when-nothing-consumes-a-marker -->
---
instruction_id: complete-on-the-artifact-when-nothing-consumes-a-marker
title: Complete on the artifact when nothing consumes a marker
summary: "When no downstream step reads a completion marker, the artifacts on disk are the completion contract."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: A step produces artifacts that a later step detects by their presence.
conditions_does_not_apply_when: A later step parses a completion marker in the returned text.
artifact_contract_output_type: artifact-completion
artifact_contract_required_data:
  - the artifacts on disk
  - the flag that marks them
artifact_contract_verified_by: "the completion was detected from the files, not from a returned string"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Complete on the artifact when nothing consumes a marker
Gap-closure completion has **no completion marker**: nothing consumes one. The return contract is the artifacts themselves — `verify-work.md` spawns you in `--gaps` mode, and your output is complete when the fix plans are on disk carrying `gap_closure: true` in their frontmatter; the spawning workflow detects the files (never a return string)
<!-- vpmodule:atom:end complete-on-the-artifact-when-nothing-consumes-a-marker -->
<!-- vpmodule:atom:begin derive-the-truths-the-artifacts-the-wiring-and-the-key-links -->
---
instruction_id: derive-the-truths-the-artifacts-the-wiring-and-the-key-links
title: "Derive the truths, the artifacts, the wiring and the key links"
summary: "A goal is decomposed into observable truths, the artifacts each truth needs, the wiring that feeds them and the links whose failure cascades."
capability_tags:
  - plan-implementation
pattern_tags:
  - working-backwards
conditions_applies_when: A goal has to be turned into a plan.
conditions_does_not_apply_when: The plan already exists and only needs a revision.
artifact_contract_output_type: goal-derivation
artifact_contract_required_data:
  - the observable truths
  - the artifacts
  - the wiring
  - the key links
artifact_contract_verified_by: every truth is verifiable by a human and every artifact is a specific file or object
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Derive the truths, the artifacts, the wiring and the key links
### Step 2: Derive Observable Truths
### Step 3: Derive Required Artifacts
### Step 4: Derive Required Wiring
### Step 5: Identify Key Links
**Test:** Each truth verifiable by a human using the application.
**Test:** Each artifact = a specific file or database object.
"Where is this most likely to break?" Key links = critical connections where breakage causes cascading failures.
<!-- vpmodule:atom:end derive-the-truths-the-artifacts-the-wiring-and-the-key-links -->
<!-- vpmodule:atom:begin give-every-parallel-unit-exclusive-file-ownership -->
---
instruction_id: give-every-parallel-unit-exclusive-file-ownership
title: Give every parallel unit exclusive file ownership
summary: Two units may run in parallel only when their file lists do not overlap; an overlapping file makes the later unit depend on the earlier one.
capability_tags:
  - plan-implementation
pattern_tags:
  - parallel-execution
conditions_applies_when: Units are grouped into a wave that will run in parallel.
conditions_does_not_apply_when: The units are ordered by an explicit dependency.
artifact_contract_output_type: file-ownership
artifact_contract_required_data:
  - the files each unit touches
  - the overlap
  - the dependency it creates
artifact_contract_verified_by: no two units in the same wave claim the same file without a dependency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Give every parallel unit exclusive file ownership
Exclusive file ownership prevents conflicts
No overlap → can run parallel. File in multiple plans → later plan depends on earlier
<!-- vpmodule:atom:end give-every-parallel-unit-exclusive-file-ownership -->
<!-- vpmodule:atom:begin order-the-tasks-contracts-then-implementation-then-wiring -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
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
<!-- vpmodule:atom:end order-the-tasks-contracts-then-implementation-then-wiring -->
<!-- vpmodule:atom:begin prefer-vertical-slices-over-horizontal-layers -->
---
instruction_id: prefer-vertical-slices-over-horizontal-layers
title: Prefer vertical slices over horizontal layers
summary: The phase is decomposed into vertical slices; a horizontal layer decomposition is used only when a shared foundation is required.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: The plans of a phase are laid out.
conditions_does_not_apply_when: The phase genuinely needs a shared foundation first.
artifact_contract_output_type: decomposition-order
artifact_contract_required_data:
  - the slices
  - the order they run in
  - the reason for a horizontal step
artifact_contract_verified_by: the plans are slices unless a shared foundation was required
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer vertical slices over horizontal layers
**Prefer vertical slices** (User feature: model+API+UI) over horizontal layers (all models → all APIs → all UIs). Vertical = parallel. Horizontal = sequential. Use horizontal only when shared foundation is required
<!-- vpmodule:atom:end prefer-vertical-slices-over-horizontal-layers -->
<!-- vpmodule:atom:begin size-a-task-by-the-context-it-consumes -->
---
instruction_id: size-a-task-by-the-context-it-consumes
title: Size a task by the context it consumes
summary: "A task is sized by the context it consumes and not by time: too small it is combined with a related task, too large it is split in two."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The tasks of a plan are being sized.
conditions_does_not_apply_when: The tasks are already sized and only their content is being written.
artifact_contract_output_type: task-sizing
artifact_contract_required_data:
  - the context cost of each task
  - the split or merge it needs
artifact_contract_verified_by: every task sits in the band that fits one context window and no task was split for a reason other than its size
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Size a task by the context it consumes
Each task targets **10-30% context consumption**.
| Context Cost | Action |
|--------------|--------|
| < 10% context | Too small - combine with a related task |
| 10-30% context | Right size - proceed |
| > 30% context | Too large - split into two tasks |
**Context cost signals (use these, not time estimates):**
Files modified: 0-3 = ~10-15%, 4-6 = ~20-30%, 7+ = ~40%+ (split)
New subsystem: ~25-35%
Migration + data transform: ~30-40%
Pure config/wiring: ~5-10%
**Too large signals:** Touches >3-5 files, multiple distinct chunks, action section >1 paragraph.
**Combine signals:** One task sets up for the next, separate tasks touch same file, neither meaningful alone.
**Rule:** Plans should complete within ~50% context. More plans, smaller scope, consistent quality. Each plan: 2-3 tasks max.
- Estimate effort in context window cost, not time
<!-- vpmodule:atom:end size-a-task-by-the-context-it-consumes -->
<!-- vpmodule:atom:begin size-the-task-by-its-context-cost -->
---
instruction_id: size-the-task-by-its-context-cost
title: Size the task by its context cost
summary: "A task is sized by the context it consumes, not by an estimate in time; below the floor it is merged, above the ceiling it is split."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: The tasks of a plan are written.
conditions_does_not_apply_when: The plan is a single mechanical change.
artifact_contract_output_type: task-sizing
artifact_contract_required_data:
  - the context cost of the task
  - the files it touches
  - the sizing decision
artifact_contract_verified_by: every task falls inside the context band or was merged or split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Size the task by its context cost
Each task targets **10–30% context consumption**
| Context Cost | Action |
|--------------|--------|
| < 10% context | Too small — combine with a related task |
| 10-30% context | Right size — proceed |
| > 30% context | Too large — split into two tasks |
**Context cost signals (use these, not time estimates):**
- Files modified: 0-3 = ~10-15%, 4-6 = ~20-30%, 7+ = ~40%+ (split)
- New subsystem: ~25-35%
- Migration + data transform: ~30-40%
- Pure config/wiring: ~5-10%
**Too large signals:** Touches >3-5 files, multiple distinct chunks, action section >1 paragraph
<!-- vpmodule:atom:end size-the-task-by-its-context-cost -->
<!-- vpmodule:atom:begin strip-the-enterprise-ceremony-from-the-plan -->
---
instruction_id: strip-the-enterprise-ceremony-from-the-plan
title: Strip the enterprise ceremony from the plan
summary: "Team structures, matrices, sprint ceremonies, time estimates and documentation for its own sake are removed from the plan."
capability_tags:
  - plan-implementation
pattern_tags:
  - code-minimization
conditions_applies_when: A plan is written for one person and one implementer.
conditions_does_not_apply_when: The work genuinely runs across a team that owns the ceremonies.
artifact_contract_output_type: plan-content
artifact_contract_required_data:
  - the removed ceremony
  - the plan that remains
artifact_contract_verified_by: "no team structure, matrix, ceremony or time estimate remains in the plan"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Strip the enterprise ceremony from the plan
**Anti-enterprise patterns (delete if seen):** team structures, RACI matrices, sprint ceremonies, time estimates in human units, complexity/difficulty as scope justification, documentation for documentation's sake
<!-- vpmodule:atom:end strip-the-enterprise-ceremony-from-the-plan -->