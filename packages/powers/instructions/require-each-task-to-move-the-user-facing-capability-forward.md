---
instruction_id: require-each-task-to-move-the-user-facing-capability-forward
title: Require each task to move the user-facing capability forward
summary: Every task must leave a real user able to do more than before; a task that only lays a foundation is a horizontal task in disguise.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: The tasks of a feature are written.
conditions_does_not_apply_when: The plan is the walking skeleton of a new project.
artifact_contract_output_type: slice-acceptance
artifact_contract_required_data:
  - the user-visible capability after each task
  - the slice the task opens
artifact_contract_verified_by: after each task a user can do something they could not do before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Require each task to move the user-facing capability forward
**Decompose by feature slice, not by technical layer.** Every task must move the user-facing capability forward. After each task, a real user can click through more of the feature than they could before
**Forbidden** under tracer-first:
- "Create the database schema" as a standalone task
- "Build the API layer" as a standalone task
- "Wire up the UI" as a final integration task
The leading `tracer` task produces a working end-to-end path — production-quality, not a prototype. Stubs are allowed ONLY where they can later be filled without an architectural change; the happy path must be real
**Acceptance Test for Your Plan**
Before emitting the plan, ask: **after Task N completes, can a real user *do* something they could not do after Task N-1?** If the answer is "no, but the foundation is laid", you have a horizontal task disguised as a slice. Restructure.
