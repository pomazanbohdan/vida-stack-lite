---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-slice-md-67ce9af6-c01"
title: "bmad-method: skills/bmad-agent-po/references/slice.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-agent-po/references/slice.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/slice.md\"}"
atom_ids:
  - ask-the-questions-that-decide-the-split
  - close-an-epic-with-a-refactor-sweep
  - cut-the-work-into-epics-by-capability-and-owner
  - every-prerequisite-is-real-and-none-restates-the-order
  - keep-lanes-independent
  - plan-the-whole-epic-not-only-the-next-story
  - present-the-set-in-build-order-and-name-the-rule
  - propose-a-parent-initiative-instead-of-nesting-epics
atom_count: 8
atoms: "[{\"atom_id\":\"ask-the-questions-that-decide-the-split\",\"file_sha256\":\"5f494ff352bf90b250d08ae9e2557eb2907ecb1510192a8baa59eb2ed68b2206\",\"content_sha256\":\"0da5331bf245031a1ac55d9e0c3f8f01e3d0119bfafcebab10a7a8020643345c\",\"file_bytes\":1430,\"body_bytes\":355},{\"atom_id\":\"close-an-epic-with-a-refactor-sweep\",\"file_sha256\":\"fd561eb891ead59bca8cb96755a49555a4ffec9224f4ee3cea374d8370518fe7\",\"content_sha256\":\"f2a83805f6d0f5adda3325ffc4212fa05ac1817e980faf5fa400a0bbbe69938f\",\"file_bytes\":1736,\"body_bytes\":576},{\"atom_id\":\"cut-the-work-into-epics-by-capability-and-owner\",\"file_sha256\":\"d899c84fd4cfff9911d308038f5ce1310ab99429052c28aef8fcbcea0e1e1dde\",\"content_sha256\":\"63611a4342b80f731cd89e711957e2f17cd89dafd279add5363b51549a695d2a\",\"file_bytes\":1808,\"body_bytes\":613},{\"atom_id\":\"every-prerequisite-is-real-and-none-restates-the-order\",\"file_sha256\":\"f3ca4e47b385870b85304b5266a485d210ea7391ed4a03cea7c3852373059196\",\"content_sha256\":\"624897034333a9e8b54a0cdb7d7c85f030d44cf32d507b5049be9067eeb30b56\",\"file_bytes\":1452,\"body_bytes\":214},{\"atom_id\":\"keep-lanes-independent\",\"file_sha256\":\"95a1b0a3bc1147694f4d4df1715e5a8690edbf984f0197b7e8ad815ab64dfbf1\",\"content_sha256\":\"a12db665fcb872a0825675f52931a226beeae41e789d1edd243328077e563a1a\",\"file_bytes\":1740,\"body_bytes\":511},{\"atom_id\":\"plan-the-whole-epic-not-only-the-next-story\",\"file_sha256\":\"55323128585ef3c671b299be031e1eae7f1da304eb15d198865ffdf85a92554f\",\"content_sha256\":\"d32faecc076199531029086cadb1c6303b88e1e4753b5fd7c80d6b7a14dbb84a\",\"file_bytes\":1672,\"body_bytes\":497},{\"atom_id\":\"present-the-set-in-build-order-and-name-the-rule\",\"file_sha256\":\"74f9f32a22095d86e78ed7c60d6a0ef271739cc4be9eb39f678ee46e479337d2\",\"content_sha256\":\"1198e63887ad8e38b6929a013d7cff344ae51a8e1d37b00675f8300138b06d47\",\"file_bytes\":2179,\"body_bytes\":854},{\"atom_id\":\"propose-a-parent-initiative-instead-of-nesting-epics\",\"file_sha256\":\"06923699f7043a3494daa8a75d8bd0366d1cfe8690b3bfb420dec0bd7371a87d\",\"content_sha256\":\"b79fc24ac5133d56d71ef2cff22c97c7bfc67f0de6c6c6f7c86dacab91c6f11f\",\"file_bytes\":1897,\"body_bytes\":677}]"
carrier_sha256: 44bebf8d62778eac5b9ce004db7880315741b69569dd54568310074b360c68f2
carrier_bytes: 15057
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-the-questions-that-decide-the-split -->
---
instruction_id: ask-the-questions-that-decide-the-split
title: Ask the questions that decide the split
summary: "Ask only the questions that change the cut, grouped, and say which answer you would pick and why."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The cut of the work is not decided yet.
conditions_does_not_apply_when: The cut is already decided and only the items are missing.
artifact_contract_output_type: split-questions
artifact_contract_required_data:
  - the questions that change the cut
  - the answer you would pick
  - the reason
artifact_contract_verified_by: every question asked changes the cut and each carries your own answer and reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Ask the questions that decide the split
Use what is already known. Ask the remaining questions that change the split: what is first worth demoing; what is least certain; what will the first piece teach about the rest; whether the user has a split in mind; how the team defines epics. Group related questions and say which answer you would pick and why.
<!-- vpmodule:atom:end ask-the-questions-that-decide-the-split -->
<!-- vpmodule:atom:begin close-an-epic-with-a-refactor-sweep -->
---
instruction_id: close-an-epic-with-a-refactor-sweep
title: Close a container with a refactor sweep
summary: "A container of more than three items closes with a cleanup item that waits on every other one, takes cleanup only, and is offered by default."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A container has more than three items and the cleanup it will leave behind has to land somewhere.
conditions_does_not_apply_when: The container has three or fewer items.
artifact_contract_output_type: closing-item
artifact_contract_required_data:
  - the closing item
  - the scope it takes
  - the decision line when the user declines
artifact_contract_verified_by: the container closes with a cleanup item that waits on every other item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Close a container with a refactor sweep
An epic of more than three entries gets a closing story "Refactor sweep" that waits on every other entry except a closing end-to-end suite. Its scope is set when it starts, from the plans and the review findings deferred during the epic. It takes cleanup only; scope pushed out of another story is a new story. Propose it by default; when the user declines, record a `Decision:` line in the epic's Notes.
One closing end-to-end suite across the epic, after the sweep, is offered when the source has a test plan or the user wants one.
<!-- vpmodule:atom:end close-an-epic-with-a-refactor-sweep -->
<!-- vpmodule:atom:begin cut-the-work-into-epics-by-capability-and-owner -->
---
instruction_id: cut-the-work-into-epics-by-capability-and-owner
title: Cut the work into epics by capability and deployment boundary
summary: "Each epic is one capability from the source, or a tightly coupled pair, delivered and deployed together; a boundary that names two outcomes or two deployments is two epics."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A body of work has to be cut into containers.
conditions_does_not_apply_when: The containers already exist and only the items under them change.
artifact_contract_output_type: container-set
artifact_contract_required_data:
  - the capability each container delivers
  - its deployment boundary
  - its boundary
artifact_contract_verified_by: each container names one capability and one deployment boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Cut the work into containers by capability and deployment boundary
An epic is one capability from the source, or a tightly coupled pair, delivered and deployed together.
Propose epics along the source's capabilities. Merge two when one deployment delivers both.
A unit (module, service, or bounded context) is an epic boundary only when it is also a deployment boundary and its Done when still reads as something a product owner can check. A module that is only a code folder is not.
Two epics need at most a contract between them.
An epic whose boundary names more than one outcome or deployment is two epics.
<!-- vpmodule:atom:end cut-the-work-into-epics-by-capability-and-owner -->
<!-- vpmodule:atom:begin every-prerequisite-is-real-and-none-restates-the-order -->
---
instruction_id: every-prerequisite-is-real-and-none-restates-the-order
title: Every prerequisite is real and none restates the order
summary: "Every dependency between items is a real prerequisite, across containers included, and none of them restates the sequence."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: The dependencies between items are checked.
conditions_does_not_apply_when: The items have no dependencies.
artifact_contract_output_type: dependency-check
artifact_contract_required_data:
  - each dependency
  - what it really needs
  - the order it does not restate
artifact_contract_verified_by: every dependency is a real prerequisite and none of them restates the order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Every prerequisite is real and none restates the order
Every `after` is a real prerequisite, those in other epics included, and none restates the order.
`after` holds real prerequisites only, never the sequence.
<!-- vpmodule:atom:end every-prerequisite-is-real-and-none-restates-the-order -->
<!-- vpmodule:atom:begin keep-lanes-independent -->
---
instruction_id: keep-lanes-independent
title: Keep the lanes independent
summary: "A lane is a run of items that touch the same code; items in different lanes never touch the same code, and a boundary two lanes share gets its own interface and stub first."
capability_tags:
  - coordinate-program
pattern_tags:
  - parallel-execution
conditions_applies_when: Items in a breakdown can run in parallel.
conditions_does_not_apply_when: The items run one after the other and share nothing.
artifact_contract_output_type: lane-plan
artifact_contract_required_data:
  - the lanes
  - the items in each lane
  - the shared boundary and its owner
artifact_contract_verified_by: no two items in different lanes touch the same code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the lanes independent
A lane is a run of stories that touch the same code, in order; stories in different lanes never touch the same code. Two that would are one story, or one waits on the other.
A boundary two lanes share gets its interface and a stub as its own early story, so both lanes open at once.
Collisions: two items with no dependency path between them can run at the same time, so they share no code, config, schema, or setup. Where they would, one goes in the other's `after` or they merge.
<!-- vpmodule:atom:end keep-lanes-independent -->
<!-- vpmodule:atom:begin plan-the-whole-epic-not-only-the-next-story -->
---
instruction_id: plan-the-whole-epic-not-only-the-next-story
title: "Plan the whole container, not only the next item"
summary: "Plan the entire container, and put every unknown that must be settled before implementation to the user instead of guessing the design of work that depends on it."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: A container is being planned.
conditions_does_not_apply_when: The plan for the container already exists and is being executed.
artifact_contract_output_type: container-plan
artifact_contract_required_data:
  - "the whole container's plan"
  - the unknowns put to the user
  - the spike added for an unknown
artifact_contract_verified_by: the plan covers the whole container and no unknown is answered by a guess
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Plan the whole container, not only the next item
The epic is ready to be worked and its spec exists or the user chose to go without. Read its breakdown, every child ticket, and their results before proposing changes. Plan the entire epic, not only its next story.
Put each unknown that must be settled before implementation to the user: answer it now, record it as the `unknown` of the entries it affects, or add a spike when they ask for one. Never guess the design of work that depends on it.
<!-- vpmodule:atom:end plan-the-whole-epic-not-only-the-next-story -->
<!-- vpmodule:atom:begin present-the-set-in-build-order-and-name-the-rule -->
---
instruction_id: present-the-set-in-build-order-and-name-the-rule
title: Present the set in build order and name the rule
summary: "Show the cut in build order, say in one sentence which rule cut it, and name the tracer path, the touch points, the shared decisions, what can run in parallel and what is deferred."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A cut of the work has to be shown to the user for approval.
conditions_does_not_apply_when: The user asked for the items one by one as they are written.
artifact_contract_output_type: proposed-set
artifact_contract_required_data:
  - the order
  - the rule that cut it
  - the tracer path
  - the touch points
  - the shared decisions
  - what can run in parallel
  - the deferred scope
artifact_contract_verified_by: "the set is in build order, the rule that cut it is named, and the tracer path, touch points and shared decisions are listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Present the set in build order and name the rule
Draft the set, run the tree check in `validate.md` on the draft, then present it in recommended build order and say in one sentence which rule cut it. For each epic: title, one to three sentences of what is true when it is done, the parent ids it owns, its boundary, and what it needs from the epics before it.
With the set, present:
the tracer path across epics, when the first demo cuts through several;
every touch point, with the epic that owns it;
the decisions more than one epic must adopt: a contract, a message or data format, a shared value list. One repo or one unit has none.
With the draft, name the tracer bullet, what can run in parallel, and any deferred scope. With the approval question, ask once whether the user wants to change a description or add a note or reference to any entry.
<!-- vpmodule:atom:end present-the-set-in-build-order-and-name-the-rule -->
<!-- vpmodule:atom:begin propose-a-parent-initiative-instead-of-nesting-epics -->
---
instruction_id: propose-a-parent-initiative-instead-of-nesting-epics
title: Propose a parent initiative instead of nesting epics
summary: "When the work is more than one initiative's worth, propose a parent initiative over child initiatives; the parent lists children in build order and holds no epics or entries."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is larger than one initiative.
conditions_does_not_apply_when: The work fits one initiative and its epics.
artifact_contract_output_type: parent-initiative
artifact_contract_required_data:
  - the child initiatives in build order
  - each child's id, slug, description, covers and after
  - the parent's shared Requirements
artifact_contract_verified_by: "the parent lists only child initiatives and every child names the parent in `sources:`"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Propose a parent initiative instead of nesting epics
When the work is more than one initiative's worth, propose a parent initiative over child initiatives, not epics inside epics.
The parent is an ordinary initiative whose `tickets/tickets.toml` lists its child initiatives in build order, each with an `id`, the child's folder name as `slug`, a description of what is true when it is done, the parent ids it `covers`, and an `after` naming what it needs from which child.
Each child is its own `initiative-<slug>/` beside the parent, with the parent's file in `sources:`; its Requirements are written per `spec.md` when it is taken up.
The parent holds no epics or entries.
<!-- vpmodule:atom:end propose-a-parent-initiative-instead-of-nesting-epics -->