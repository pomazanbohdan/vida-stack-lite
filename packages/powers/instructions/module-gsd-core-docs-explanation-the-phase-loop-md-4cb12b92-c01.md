---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-the-phase-loop-md-4cb12b92-c01"
title: "gsd-core: docs/explanation/the-phase-loop.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/explanation/the-phase-loop.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/the-phase-loop.md\"}"
atom_ids:
  - settle-the-decisions-in-conversation-before-you-plan
  - size-the-phase-by-four-testable-criteria
  - verify-the-decisions-not-just-the-task-completion
  - write-the-design-contract-before-any-code
atom_count: 4
atoms: "[{\"atom_id\":\"settle-the-decisions-in-conversation-before-you-plan\",\"file_sha256\":\"c5b7e7c378084d3eed3e7a6bf97a8268b68318edfd1d65183dc69db192bdde10\",\"content_sha256\":\"b7623d1816340b4400c08b7e3f41602de0f4ca3287839b95aea334f5110c9966\",\"file_bytes\":1663,\"body_bytes\":464},{\"atom_id\":\"size-the-phase-by-four-testable-criteria\",\"file_sha256\":\"88dd053ba22eb4e41648fb2507d10659905234655d421d6c7e7269426e7271d3\",\"content_sha256\":\"5af855fe314da25bb5da153a4445d36b6ebc87c33baa666641912ee42aaab3ad\",\"file_bytes\":1717,\"body_bytes\":485},{\"atom_id\":\"verify-the-decisions-not-just-the-task-completion\",\"file_sha256\":\"4314208ae761c318d1acff7c8ecdaceb56ddb581039b8477f76e2f402a8f216b\",\"content_sha256\":\"36fc9f240680d54ed1dbced2eede3b5c45af0153797b53db385d96c342c2f497\",\"file_bytes\":1658,\"body_bytes\":438},{\"atom_id\":\"write-the-design-contract-before-any-code\",\"file_sha256\":\"023177080af870a68855ce8f1ce3737c510e173ae03d9125473b9d6318938e3b\",\"content_sha256\":\"6403036b8796b232cf65128987451f208021030df8281329083672c19f0850d9\",\"file_bytes\":1477,\"body_bytes\":252}]"
carrier_sha256: 4da93d8a28f78c48da29a5f74cf9479fc734fc5239a99d2cd37493583367d14f
carrier_bytes: 7110
revision: 1
status: active
---
<!-- vpmodule:atom:begin settle-the-decisions-in-conversation-before-you-plan -->
---
instruction_id: settle-the-decisions-in-conversation-before-you-plan
title: Settle the decisions in conversation before you plan
summary: "The decisions that shape the work are captured in a short conversation with the person who owns them, before the plan is written, so the plan is not built on a guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A piece of work is about to be planned and the open decisions are not settled.
conditions_does_not_apply_when: Every decision is already recorded and agreed.
artifact_contract_output_type: decision-capture
artifact_contract_required_data:
  - the decisions that are open
  - who settles them
  - the record the plan reads
artifact_contract_verified_by: the decisions were settled in conversation and recorded before the plan was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Settle the decisions in conversation before you plan
- Planning cannot begin until you know *how* to build the thing, not just *what* to build.
- Without a Discuss step, the planner must make these calls itself. Sometimes it guesses right. Often it guesses plausibly but wrongly — producing a plan that is coherent but misaligned with your actual preferences.
- The Discuss step is deliberately lightweight. It is a conversation, not a specification exercise.
<!-- vpmodule:atom:end settle-the-decisions-in-conversation-before-you-plan -->
<!-- vpmodule:atom:begin size-the-phase-by-four-testable-criteria -->
---
instruction_id: size-the-phase-by-four-testable-criteria
title: Size the phase by four testable criteria
summary: "A unit of work is accepted as the right size only when its goal is one sentence, its research is bounded, its execution splits into a handful of independent plans, and its done-state is checkable without reading the whole codebase."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A unit of work is being sized before it is planned.
conditions_does_not_apply_when: The unit of work is already agreed and recorded.
artifact_contract_output_type: scope-criteria
artifact_contract_required_data:
  - the one-sentence goal
  - the bounded research
  - the number of independent plans
  - the testable done-state
artifact_contract_verified_by: "all four criteria hold, or the unit of work was split"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
  - research
---

# Size the phase by four testable criteria
- The goal can be stated in a single sentence that is neither obviously trivial nor suspiciously broad.
- The research needed to plan it is bounded — the ecosystem questions have answers that do not depend on other phases completing first.
- The execution can be parallelised into a handful of non-overlapping plans, not dozens.
- There is a clear, testable definition of done that a verifier can check without reading the entire codebase.
<!-- vpmodule:atom:end size-the-phase-by-four-testable-criteria -->
<!-- vpmodule:atom:begin verify-the-decisions-not-just-the-task-completion -->
---
instruction_id: verify-the-decisions-not-just-the-task-completion
title: "Verify the decisions, not just the task completion"
summary: "A phase is complete when what was built is what was planned and what was planned is what was decided; the check covers requirement coverage, decision coverage and goal alignment."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A phase's work is finished and its outcome is being checked."
conditions_does_not_apply_when: The check only reports which tasks ran.
artifact_contract_output_type: goal-verification
artifact_contract_required_data:
  - the phase goal
  - the requirements that were addressed
  - the decisions that were implemented
artifact_contract_verified_by: "the check covered requirements, decisions and goal alignment, not only task completion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - product
---

# Verify the decisions, not just the task completion
- A phase is not done because execution finished without errors. It is done because what was built is what was planned, and what was planned is what was decided.
- Verification is not just testing. It checks requirement coverage (were all the REQ-IDs addressed?), decision coverage (were the decisions captured in `CONTEXT.md` actually implemented?), and overall phase goal alignment.
<!-- vpmodule:atom:end verify-the-decisions-not-just-the-task-completion -->
<!-- vpmodule:atom:begin write-the-design-contract-before-any-code -->
---
instruction_id: write-the-design-contract-before-any-code
title: Write the design contract before any code
summary: "A design that would otherwise produce divergent implementations is written down as a contract before the code is written, because the contract is cheaper to write than the divergence is to undo."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - specification-gate
conditions_applies_when: A piece of work has a visual or interaction surface that could be implemented in more than one way.
conditions_does_not_apply_when: The surface is unambiguous.
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the design contract
  - the surface it describes
  - the point at which it was written
artifact_contract_verified_by: "the design contract was written before any code and describes the layout, interaction and behavior"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Write the design contract before any code
- It produces a `UI-SPEC.md` — a design contract that describes layout, interaction, and visual behaviour before any code is written.
- A clear design contract is far cheaper to write than to re-implement.
<!-- vpmodule:atom:end write-the-design-contract-before-any-code -->