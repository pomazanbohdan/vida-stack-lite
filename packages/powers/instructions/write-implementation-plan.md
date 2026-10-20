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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 3
---

# Write the plan for an engineer who has not seen the codebase

Write implementation plans for an engineer who has not seen this codebase or this spec.
Assume they write idiomatic code in the language of the project once they know the exact interface and the exact test, and that they make a reasonable choice wherever the plan leaves one open.

What they cannot know is what you decided: which files, which names and signatures, which values from the spec, which tests prove each task. Document those, and give them the whole plan as bite-sized tasks. DRY, YAGNI, TDD, frequent commits.

Start every plan with a header that states the goal, the architecture, the tech stack, the path of the spec the plan implements, the global constraints copied verbatim from the spec, and the review focus: the input classes or failure modes the spec implies but no task tests, most likely to bite first, one line each. The spec is a vision document: its silence about an input is not permission for that input to break the program.

Check the scope first: if the spec covers multiple independent subsystems, suggest breaking it into separate plans, one per subsystem, and each plan should produce working, testable software on its own.

Before defining the tasks, map out which files will be created or modified and what each one is responsible for. Design units with clear boundaries and well-defined interfaces, give each file one clear responsibility, and keep files that change together together. Split by responsibility, not by technical layer, and follow the established patterns of an existing codebase.

Right-size the tasks: a task is the smallest unit that carries its own test cycle and is worth a fresh reviewer gate. Fold setup, configuration, scaffolding and documentation steps into the task whose deliverable needs them, and split only where a reviewer could meaningfully reject one task while approving its neighbour. Each task ends with an independently testable deliverable.

For each task state the exact files to create or modify, the exact interfaces it consumes and produces, and the tests that prove it.

Make every step one action with a checkable result: write the failing test, run it to make sure it fails, implement the minimal code that makes the test pass, run the tests and make sure they pass, commit.
