---
instruction_id: check-the-task-breakdown-is-mece-at-the-requirement-level
title: Check the task breakdown is MECE at the requirement level
summary: "Every requirement maps to exactly one task, two tasks on one file serve different requirements, and no requirement is uncovered."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The task breakdown of a phase is complete.
conditions_does_not_apply_when: The phase has a single requirement and a single obvious task.
artifact_contract_output_type: requirement-coverage
artifact_contract_required_data:
  - the requirements
  - the task each maps to
  - the uncovered requirements
artifact_contract_verified_by: every requirement maps to exactly one task and no requirement is uncovered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check the task breakdown is MECE at the requirement level
Verify this task breakdown is MECE at the REQUIREMENT level: (1) list every requirement from the phase goal, (2) confirm each maps to exactly one task's `<done>`, (3) if two tasks modify the same file, confirm they modify DIFFERENT sections or serve DIFFERENT requirements, (4) flag any requirement not covered by any task
