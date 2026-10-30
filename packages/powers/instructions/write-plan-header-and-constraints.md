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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 2
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
