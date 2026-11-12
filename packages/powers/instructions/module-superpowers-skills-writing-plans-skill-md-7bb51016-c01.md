---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-writing-plans-skill-md-7bb51016-c01"
title: "superpowers: skills/writing-plans/SKILL.md module"
summary: "Carrier for 5 atomic instructions from superpowers:skills/writing-plans/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/writing-plans/SKILL.md\"}"
atom_ids:
  - map-file-structure-before-tasks
  - offer-plan-execution-methods
  - self-review-plan-against-spec
  - write-implementation-plan
  - write-plan-header-and-constraints
atom_count: 5
atoms: "[{\"atom_id\":\"map-file-structure-before-tasks\",\"file_sha256\":\"2125462f99fb8ab0a25f284c47c47b29354c9617b0f2da89bc2f0e48dd8441bb\",\"content_sha256\":\"bb6a60828c617770241ef8eeb885e46f259170d8d037e01b82601353e33a3ceb\",\"file_bytes\":2798,\"body_bytes\":1511},{\"atom_id\":\"offer-plan-execution-methods\",\"file_sha256\":\"c7465e22ab2e26a68ef7b18c0a77d868441ea08e7a5d3c6ef1233e488db8d846\",\"content_sha256\":\"9d44f3c638426f77213821a273f1c04d7aa091b8a759e40f96beac431ced0a9a\",\"file_bytes\":2457,\"body_bytes\":1387},{\"atom_id\":\"self-review-plan-against-spec\",\"file_sha256\":\"99d470baa6843ce161ee639ce559d9932afc3bbb4aca93d91348f659601f97c7\",\"content_sha256\":\"6de2abfb92886c34be14051df2fcc529393e52374ccdb6d12e64a421c29e92c8\",\"file_bytes\":2921,\"body_bytes\":1725},{\"atom_id\":\"write-implementation-plan\",\"file_sha256\":\"07f311ea30a814cb6ee8c4e8d9eb6a9ce66659a4e5deed4fd4935b2b0c9ec53a\",\"content_sha256\":\"507428bf4ff386845566540d7e08f4c6fb0c453f2a806bb0dbcaefbdd6536828\",\"file_bytes\":6087,\"body_bytes\":4557},{\"atom_id\":\"write-plan-header-and-constraints\",\"file_sha256\":\"e8802b2c74c0f065420d8172ab50970347bae3c2bd31885d53d9d89dcd1db652\",\"content_sha256\":\"9165d5cf29f5f10178290ff5b48a3a5719f7cd4dae0fc14435c7836840f7dde9\",\"file_bytes\":2374,\"body_bytes\":1311}]"
carrier_sha256: 75e79dcabb6a5aeec704af4388e2725489da3c058e8258eca12522b7df048c37
carrier_bytes: 17218
revision: 1
status: active
---
<!-- vpmodule:atom:begin map-file-structure-before-tasks -->
---
instruction_id: map-file-structure-before-tasks
title: Map the file structure before defining tasks
summary: Decide which files are created or modified and what each one is responsible for before splitting the plan into tasks.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan covers several files or new components.
conditions_does_not_apply_when: The change touches one small file and introduces no new boundaries.
artifact_contract_output_type: file-structure-map
artifact_contract_required_data:
  - files
  - responsibilities
  - interfaces
  - risks
artifact_contract_verified_by: every planned file has one responsibility
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/plan-template.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Map the file structure before defining tasks
Before defining tasks, map out which files will be created or modified and what each one is responsible for.
This is where decomposition decisions get locked in.
Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
You reason best about code you can hold in context at once, and your edits are more reliable when files are focused.
Prefer smaller, focused files over large ones that do too much.
Files that change together should live together. Split by responsibility, not by technical layer.
In existing codebases, follow established patterns.
If the codebase uses large files, don't unilaterally restructure.
If a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
This structure informs the task decomposition.
Each task should produce self-contained changes that make sense independently.
If the spec covers multiple independent subsystems, suggest breaking this into separate plans — one per subsystem.
Each plan should produce working, testable software on its own.
A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate.

Keep only what the work needs: the specific files, symbols or lines, what to reuse, and what not to change. Write that into the Code Map.

Put the investigation into the Code Map: paths, symbols or lines, what to reuse, and what not to change.

Annotated paths prevent blind codebase searching.
<!-- vpmodule:atom:end map-file-structure-before-tasks -->
<!-- vpmodule:atom:begin offer-plan-execution-methods -->
---
instruction_id: offer-plan-execution-methods
title: Offer the execution method and wait for the choice
summary: "After the plan is saved, ask the owner to review it, present subagent-driven and inline execution with one recommendation, and wait."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan is ready for the owner to review and execute.
conditions_does_not_apply_when: The owner already supplied an execution method for this plan.
artifact_contract_output_type: execution-method-choice
artifact_contract_required_data:
  - plan
  - methods
  - recommendation
  - owner choice
artifact_contract_verified_by: the owner confirms the plan and the execution method
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-plans/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer the execution method and wait for the choice
After saving and self-reviewing the plan, link it for your human partner to read.
Plan complete and saved.
Please review the plan.
If they have already explicitly supplied an execution method, ask them to review the plan and confirm it captures what they want; wait for that review before implementation, then use the preserved method.
Otherwise, ask them to review the plan and choose an execution method before implementation.
Subagent-driven: a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end.
It is the most thorough; it costs a fresh context per task and per review.
Native: I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch.
It is the cheapest and fastest; there is no independent review until the end.
For this plan I recommend one of the two, because of how much the tasks depend on each other's interfaces, how many there are, and what a shipped mistake would cost.
Does the plan capture what you want, and which approach should we use?
If subagent-driven is chosen, load subagent-driven development.
If native is chosen, load executing plans.
Do not start implementation before the plan is confirmed.
Do not choose the method silently.
<!-- vpmodule:atom:end offer-plan-execution-methods -->
<!-- vpmodule:atom:begin self-review-plan-against-spec -->
---
instruction_id: self-review-plan-against-spec
title: Self-review the plan against the spec
summary: "Run the checklist yourself against the spec, repair the plan once, and block with the failing criteria when it still fails."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan is written and about to be handed off.
conditions_does_not_apply_when: "The plan is unfinished, or there is no spec to check."
artifact_contract_output_type: plan-self-review
artifact_contract_required_data:
  - spec coverage
  - step scan
  - type consistency
  - review focus
  - proportion
artifact_contract_verified_by: checklist run against every spec requirement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Self-review the plan against the spec
After writing the complete plan, look at the spec with fresh eyes and check the plan against it.
This is a checklist you run yourself — not a subagent dispatch.
Spec coverage: skim each section or requirement in the spec. Can you point to a task that implements it? List any gaps.
Step scan: every step must let the implementer write exactly one reasonable thing, and no step may carry more than that.
A line that decides nothing is a gap; a function body the signature and tests already determine is a transcript. Fix both.
Type consistency: do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks?
A function called clearLayers() in Task 3 but clearFullLayers() in Task 7 is a bug.
Review focus: for each input class or failure mode the spec implies, is there a task whose tests exercise it?
Proportion: compare the plan's length to the spec's.
A plan several times longer than the spec it implements is a transcript of the program, not a plan.
If code blocks are most of the document, replace bodies with signatures, test names and assertions, and check that each step is still unambiguous.
If you find issues, fix them inline. No need to re-review — just fix and move on.
If you find a spec requirement with no task, add the task.
An empty review focus section means you checked and found none, not that you skipped the check.

If the plan does not meet the standard: repair it once, then re-read it from disk and verify again.
If it still does not meet the standard, stop with status `blocked`, blocking condition `plan failed ready-for-development standard`, and include the failing criteria and evidence gathered.
<!-- vpmodule:atom:end self-review-plan-against-spec -->
<!-- vpmodule:atom:begin write-implementation-plan -->
---
instruction_id: write-implementation-plan
title: Write the plan for an engineer who has not seen the codebase
summary: "Turn a spec into bite-sized tasks that another engineer can execute, recording every decision you made."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "You have a spec or requirements for a multi-step task, before touching the code."
conditions_does_not_apply_when: The task is a single step with no design decision to record.
artifact_contract_output_type: implementation-plan
artifact_contract_required_data:
  - the plan header
  - the file map
  - the task list with files and interfaces
  - the steps with their checks
artifact_contract_verified_by: every task ends with an independently testable deliverable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-plans/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/spec-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 11
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the plan for an engineer who has not seen the codebase

Write implementation plans for an engineer who has not seen this codebase or this spec.
Assume they write idiomatic code in the language of the project once they know the exact interface and the exact test, and that they make a reasonable choice wherever the plan leaves one open.

What they cannot know is what you decided: which files, which names and signatures, which values from the spec, which tests prove each task. Document those, and give them the whole plan as bite-sized tasks. DRY, YAGNI, TDD, frequent commits.

Start every plan with a header that states the goal, the architecture, the tech stack, the path of the spec the plan implements, the global constraints copied verbatim from the spec, and the review focus: the input classes or failure modes the spec implies but no task tests, most likely to bite first, one line each. The spec is a vision document: its silence about an input is not permission for that input to break the program.

Check the scope first: if the spec covers multiple independent subsystems, suggest breaking it into separate plans, one per subsystem, and each plan should produce working, testable software on its own.

Before defining the tasks, map out which files will be created or modified and what each one is responsible for. Design units with clear boundaries and well-defined interfaces, give each file one clear responsibility, and keep files that change together together. Split by responsibility, not by technical layer, and follow the established patterns of an existing codebase.

Right-size the tasks: a task is the smallest unit that carries its own test cycle and is worth a fresh reviewer gate. Fold setup, configuration, scaffolding and documentation steps into the task whose deliverable needs them, and split only where a reviewer could meaningfully reject one task while approving its neighbour. Each task ends with an independently testable deliverable.

For each task state the exact files to create or modify, the exact interfaces it consumes and produces, and the tests that prove it. Give the code as signatures, test names and assertions rather than full bodies.

Make every step one action with a checkable result: write the failing test, run it to make sure it fails, implement the minimal code that makes the test pass, run the tests and make sure they pass, commit.

Review the finished plan yourself against the spec, with fresh eyes: check that every requirement of the spec has a task and list the gaps; scan the steps so that each one lets the implementer write exactly one reasonable thing and no step carries more, since a line that decides nothing is a gap and a function body the signature and tests already determine is a transcript; check that the types, method signatures and property names used later match the ones defined earlier; check that every input class of the review focus has a task whose tests exercise it; and compare the length of the plan with the length of the spec, because a plan several times longer than the spec is a transcript of the program rather than a plan. Fix what you find inline.

When the plan is complete, save it at the path the plan states and hand it over.
If the reader has already supplied an execution method, use it.
If no execution method has been supplied, report that the plan is complete and saved at its path, ask the reader to review the plan, and ask which execution approach they prefer before anything is implemented.
Never start the implementation before the review of the plan has happened.

Each task should be completable in a single focused session.
Each task has explicit acceptance criteria.
Each task includes a verification step (test, build, manual check).
Tasks are ordered by dependency, not by perceived importance.
No task should require changing more than ~5 files.
The plan should be reviewable: the human should be able to read it and say "yes, that's the right approach" or "no, change X."

The subagent should be able to work from the plan without being told any of it again.
Target 900–1300 tokens. Above 1600 = high risk of context rot.
How the agent confirms its own work. Prefer CLI commands. When no CLI check applies, state what to inspect manually.
Each verification command states the result that makes it pass: `COMMAND -- expected: SUCCESS_CRITERIA`.
The plan carries a `## Verification` section that runs every test file a loaded ticket companion lists. Run those commands before finishing; a failing command is unfinished work.
<!-- vpmodule:atom:end write-implementation-plan -->
<!-- vpmodule:atom:begin write-plan-header-and-constraints -->
---
instruction_id: write-plan-header-and-constraints
title: Write the plan header with the spec and constraints
summary: "Open the plan with goal, architecture, tech stack, the spec path, the project-wide constraints copied verbatim, and a review focus list."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan implements a spec or carries project-wide constraints.
conditions_does_not_apply_when: The plan is a short step list with no spec.
artifact_contract_output_type: plan-header
artifact_contract_required_data:
  - goal
  - architecture
  - spec
  - constraints
  - review focus
artifact_contract_verified_by: every constraint copied with its exact value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-plans/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write the plan header with the spec and constraints
Every plan MUST start with this header.
Goal: one sentence describing what this builds.
Architecture: two or three sentences about approach.
Tech stack: key technologies and libraries.
Spec: the path to the spec this plan implements — the plan argues from the spec, so the spec travels with it; executors read both.
Global constraints: the spec's project-wide requirements — version floors, dependency limits, naming and copy rules, platform requirements.
One line each, with exact values copied verbatim from the spec.
Every task's requirements implicitly include this section.
Review focus: the five input classes or failure modes the spec implies but no task's tests exercise that are most likely to bite a person using this software — one line each.
The spec is a vision document: it says what the software must do, not everything it will meet, and its silence on an input is not permission for that input to break the program.
Then, for each line, add the test that pins it to the task that owns the code, in that task's own step style.
A plan is the set of decisions the implementer cannot make alone.
A plan longer than the code it describes has written the code instead.
Do not leave a constraint only in the task where it is first mentioned.
<!-- vpmodule:atom:end write-plan-header-and-constraints -->