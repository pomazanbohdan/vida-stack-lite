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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
status: active
revision: 3
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
