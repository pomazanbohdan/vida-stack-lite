---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-planner-md-7ed09f36-c01"
title: "gsd-core: agents/gsd-planner.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:agents/gsd-planner.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-planner.md\"}"
atom_ids:
  - allow-only-three-legitimate-reasons-to-shrink-the-plan
  - check-that-every-requirement-id-appears-in-some-plan
  - give-every-task-a-verification-command-that-can-fail
  - give-the-plan-two-to-three-tasks
  - implement-the-locked-decision-exactly-and-cite-its-id
  - lead-the-plan-with-one-end-to-end-slice
  - split-the-phase-instead-of-shrinking-the-decision
  - verify-that-every-artifact-has-a-reachable-path
atom_count: 8
atoms: "[{\"atom_id\":\"allow-only-three-legitimate-reasons-to-shrink-the-plan\",\"file_sha256\":\"fca7e71271fab6a7eae38a9f706c3487227daf44848c2526baf140fe6417c39e\",\"content_sha256\":\"c03fa2f1ed8ed75745859df1905b4e7a37e3769b13f5761699ff94a5dd60223a\",\"file_bytes\":1525,\"body_bytes\":534},{\"atom_id\":\"check-that-every-requirement-id-appears-in-some-plan\",\"file_sha256\":\"47502f2f7411f7f6c882b3eea325fd8bcf8f600cbaa517cbec8f89e420764a57\",\"content_sha256\":\"c0f01c7dc832c09665885ef85c8cfb9b0bafc48a58636e38c604f8c3534b4065\",\"file_bytes\":1289,\"body_bytes\":290},{\"atom_id\":\"give-every-task-a-verification-command-that-can-fail\",\"file_sha256\":\"25885bb9bbf474ddc4c5e50bedcbda6192c38692dcdcacacce13e9381de8c33f\",\"content_sha256\":\"aa6370287dba17b5fb606acd454e13b733e05c26122c075f437598f2a145d9de\",\"file_bytes\":1347,\"body_bytes\":348},{\"atom_id\":\"give-the-plan-two-to-three-tasks\",\"file_sha256\":\"fa3c8fb5274b81d614caa8db78f70261f95d711c8ab0ca62c087aac0a62deeea\",\"content_sha256\":\"141d7d32f72be78995cb431a5af8ccc93df44e85f7dc11882f921bced07ba808\",\"file_bytes\":1153,\"body_bytes\":205},{\"atom_id\":\"implement-the-locked-decision-exactly-and-cite-its-id\",\"file_sha256\":\"c59c3d4a066db445598a5f3b1534d9ac16b3b6bc7489b950a0153922d28a71be\",\"content_sha256\":\"f34325282e8afecf51a44807930a29689914be55a99331539c4e0a89efe6002a\",\"file_bytes\":1442,\"body_bytes\":397},{\"atom_id\":\"lead-the-plan-with-one-end-to-end-slice\",\"file_sha256\":\"62b8675775c5967a9ec5e704b15f1e6abcd316ff64b1e7b7201b2f515279f232\",\"content_sha256\":\"e478229b0f0ec10dd6715141654bb3a5a7bb11319dc70bd0f66a5be46a9ea883\",\"file_bytes\":1481,\"body_bytes\":487},{\"atom_id\":\"split-the-phase-instead-of-shrinking-the-decision\",\"file_sha256\":\"85c0bb004fa2012da3535aed968541554d39f9b3aaed1875ac8616360e372f36\",\"content_sha256\":\"bb1861765e0c1be7bd58605c530984afb573952ecf9c1b422c947f622c0ea990\",\"file_bytes\":1247,\"body_bytes\":265},{\"atom_id\":\"verify-that-every-artifact-has-a-reachable-path\",\"file_sha256\":\"9673e9fb11f7cce0dc8abd7696b16f34458997ed4d1baf1b244a6e6f8eee227c\",\"content_sha256\":\"385199b69f748ad95e734a2e35be9437120527229e828e326026dd7536392622\",\"file_bytes\":1276,\"body_bytes\":310}]"
carrier_sha256: c58ed418a83c8ceaa1f3987de07367e584113946da880c45c6ad66ea2a113ece
carrier_bytes: 11979
revision: 1
status: active
---
<!-- vpmodule:atom:begin allow-only-three-legitimate-reasons-to-shrink-the-plan -->
---
instruction_id: allow-only-three-legitimate-reasons-to-shrink-the-plan
title: Allow only three legitimate reasons to shrink the plan
summary: "Context cost, missing information and a dependency conflict are the only reasons to leave work out; difficulty is not one of them."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A piece of work is left out of the plan.
conditions_does_not_apply_when: Nothing was left out.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the reason for leaving the work out
artifact_contract_verified_by: every omission names one of the three reasons
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Allow only three legitimate reasons to shrink the plan
The planner has no authority to judge a feature as too difficult, omit features because they seem challenging, or use "complex/difficult/non-trivial" to justify scope reduction.
Context cost: implementation would consume >50% of a single agent's context window
Missing information: required data not present in any source artifact
Dependency conflict: feature cannot be built until another phase ships
If a feature has none of these three constraints, it gets planned. Period.
<!-- vpmodule:atom:end allow-only-three-legitimate-reasons-to-shrink-the-plan -->
<!-- vpmodule:atom:begin check-that-every-requirement-id-appears-in-some-plan -->
---
instruction_id: check-that-every-requirement-id-appears-in-some-plan
title: Check that every requirement id appears in some plan
summary: "The requirement ids are distributed across the plans, and a requirement no plan claims is a blocking gap."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: A phase is planned against a list of requirements.
conditions_does_not_apply_when: The phase has no requirements.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the requirement ids
  - the plan that claims each
artifact_contract_verified_by: every requirement id is claimed by at least one plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Check that every requirement id appears in some plan
Every requirement ID MUST appear in at least one plan. Plans with an empty `requirements` field are invalid.
Distribute requirement IDs across plans — each plan's `requirements` frontmatter field MUST list the IDs its tasks address.
<!-- vpmodule:atom:end check-that-every-requirement-id-appears-in-some-plan -->
<!-- vpmodule:atom:begin give-every-task-a-verification-command-that-can-fail -->
---
instruction_id: give-every-task-a-verification-command-that-can-fail
title: Give every task a verification command that can fail
summary: "Each task carries an automated command, and when no test exists the task says so and creates the scaffold."
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-harness
conditions_applies_when: A task in a plan is written.
conditions_does_not_apply_when: The task is a checkpoint that waits for a person.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the verification command
  - the failing direction
artifact_contract_verified_by: every task names an automated command that can fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give every task a verification command that can fail
Nyquist Rule: Every `<verify>` includes `<automated>`. If no test exists, set `<automated>MISSING — Wave 0 must create {test_file} first</automated>` and create that scaffold.
Good: Specific automated command that runs in < 60 seconds
Bad: "It works", "Looks good", manual-only verification
<!-- vpmodule:atom:end give-every-task-a-verification-command-that-can-fail -->
<!-- vpmodule:atom:begin give-the-plan-two-to-three-tasks -->
---
instruction_id: give-the-plan-two-to-three-tasks
title: Give the plan two to three tasks
summary: "A plan carries two or three tasks; more than three, or a task that touches many files, means the plan is split."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: The work is grouped into plans.
conditions_does_not_apply_when: The plan is already within the bound.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the task count
  - the file count
artifact_contract_verified_by: no plan exceeds the task bound and the oversized ones were split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give the plan two to three tasks
2-3 tasks per plan. ALWAYS split if: >3 tasks, multiple subsystems, or any task touching >5 files.
Plan with 5+ tasks (quality degrades)
Plan with 15+ file modifications
<!-- vpmodule:atom:end give-the-plan-two-to-three-tasks -->
<!-- vpmodule:atom:begin implement-the-locked-decision-exactly-and-cite-its-id -->
---
instruction_id: implement-the-locked-decision-exactly-and-cite-its-id
title: Implement the locked decision exactly and cite its id
summary: A decision the user made is implemented as stated and carries its id in the task; a deferred idea stays out.
capability_tags:
  - execute-plan
pattern_tags:
  - frozen-intent
conditions_applies_when: A plan is written from decisions that were already made.
conditions_does_not_apply_when: "The area was left to the agent's judgement."
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the decision ids
  - the tasks that implement them
artifact_contract_verified_by: every locked decision is implemented and carries its id and no deferred idea appears
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Implement the locked decision exactly and cite its id
Locked Decisions (from `## Decisions`) — MUST be implemented exactly as specified. Reference the decision ID (D-01, D-02, etc.) in task actions for traceability.
Deferred Ideas (from `## Deferred Ideas`) — MUST NOT appear in plans.
Honor the user's locked decision
Note in task action: "Using X per user decision (research suggested Y)"
<!-- vpmodule:atom:end implement-the-locked-decision-exactly-and-cite-its-id -->
<!-- vpmodule:atom:begin lead-the-plan-with-one-end-to-end-slice -->
---
instruction_id: lead-the-plan-with-one-end-to-end-slice
title: Lead the plan with one end-to-end slice
summary: The first task wires one path through every layer and carries a real check; the rest expand from the proven slice.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: A piece of work touches several layers.
conditions_does_not_apply_when: The work is a single isolated change.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the leading task
  - the check that proves the path
artifact_contract_verified_by: the leading task is an end-to-end path with a runnable check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Lead the plan with one end-to-end slice
Every phase plan LEADS with one `type="tracer"` task — the thinnest path that touches every layer the phase will modify, wired end-to-end, carrying a real runnable `<verify>`.
A tracer is production-quality, not a prototype.
Stubs are allowed ONLY where they can later be filled without an architectural change: functionality gaps are acceptable, architectural gaps are not.
after each task a real user can do something they could not before.
<!-- vpmodule:atom:end lead-the-plan-with-one-end-to-end-slice -->
<!-- vpmodule:atom:begin split-the-phase-instead-of-shrinking-the-decision -->
---
instruction_id: split-the-phase-instead-of-shrinking-the-decision
title: Split the phase instead of shrinking the decision
summary: "When the work does not fit, the phase is split and proposed to the owner; nothing is quietly left out."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The planned work does not fit into the available budget.
conditions_does_not_apply_when: The work fits.
artifact_contract_output_type: phase-split-proposal
artifact_contract_required_data:
  - the sub-phases
  - the grouping
artifact_contract_verified_by: the split is proposed and nothing was silently omitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Split the phase instead of shrinking the decision
Never Simplify User Decisions — Split Instead
Do NOT silently omit features. Instead:
Propose how to split: which item groups form natural sub-phases
The orchestrator presents the split to the user for approval
<!-- vpmodule:atom:end split-the-phase-instead-of-shrinking-the-decision -->
<!-- vpmodule:atom:begin verify-that-every-artifact-has-a-reachable-path -->
---
instruction_id: verify-that-every-artifact-has-a-reachable-path
title: Verify that every artifact has a reachable path
summary: "Every artifact a plan promises is traced to the path that creates it, the action that triggers it or the flag that reads it."
capability_tags:
  - plan-implementation
pattern_tags:
  - verification-harness
conditions_applies_when: A plan promises artifacts.
conditions_does_not_apply_when: The plan promises nothing beyond the tasks.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the artifact
  - its path
artifact_contract_verified_by: no artifact without a path survives the check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify that every artifact has a reachable path
For each must-have artifact, verify a concrete path exists:
Entity → in-phase or existing creation path
Workflow → user action or API call triggers it
Config flag → default value + consumer
UI → route or nav link
UNREACHABLE (no path) → revise plan.
<!-- vpmodule:atom:end verify-that-every-artifact-has-a-reachable-path -->