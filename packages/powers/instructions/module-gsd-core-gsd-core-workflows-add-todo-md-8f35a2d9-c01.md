---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-add-todo-md-8f35a2d9-c01"
title: "gsd-core: gsd-core/workflows/add-todo.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/add-todo.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/add-todo.md\"}"
atom_ids:
  - confirm-a-proposed-severity-before-you-record-it
  - never-overwrite-an-incomplete-plan
atom_count: 2
atoms: "[{\"atom_id\":\"confirm-a-proposed-severity-before-you-record-it\",\"file_sha256\":\"2609f4cee004c049f6900c18b2a9ba1f3a80641327cdf96ad8a81e05453e7611\",\"content_sha256\":\"23405176bc8746b8c9509ad02bfd50fe919c3d37a4c7267d7c3dc9db8ea7d3ad\",\"file_bytes\":1718,\"body_bytes\":462},{\"atom_id\":\"never-overwrite-an-incomplete-plan\",\"file_sha256\":\"4d9bd0422e60e38bd82214acae21ed2f982830d10965293963abffafc453025a\",\"content_sha256\":\"139936f5369fec5515cacbd23bed319f20ac728f1137ec1b3aee22d43eec5ed1\",\"file_bytes\":2655,\"body_bytes\":1242}]"
carrier_sha256: d6fed99d20ec580b78f48610c7cc88c68596cca44dac07a8f3d7dc10cf17854e
carrier_bytes: 4652
revision: 1
status: active
---
<!-- vpmodule:atom:begin confirm-a-proposed-severity-before-you-record-it -->
---
instruction_id: confirm-a-proposed-severity-before-you-record-it
title: Confirm a proposed severity before you record it
summary: "The severity of a captured item is proposed and then confirmed with the user before it is written; the canonical scale is Critical (breaks a workflow or loses data), Important (wrong behavior with no workaround) and Minor (works with a workaround, or visual polish only)."
capability_tags:
  - clarify-requirements
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A captured item is classified by severity.
conditions_does_not_apply_when: The severity was confirmed by the user earlier.
artifact_contract_output_type: severity-record
artifact_contract_required_data:
  - the suggested severity
  - the confirmed severity
  - the criterion of the confirmed level
artifact_contract_verified_by: the recorded severity was confirmed with the user and uses the canonical scale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-todo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Confirm a proposed severity before you record it
Infer a suggested severity
then CONFIRM it with the user before writing.
Never silently auto-assign: a mis-tagged severity silently corrupts backlog triage, which is exactly the signal this field exists to provide.
"Critical" - breaks a workflow or loses data; fix first
"Important" - wrong behavior with no workaround
"Minor" - works, but with a workaround or annoyance
"Minor" also covers: visual/polish only
<!-- vpmodule:atom:end confirm-a-proposed-severity-before-you-record-it -->
<!-- vpmodule:atom:begin never-overwrite-an-incomplete-plan -->
---
instruction_id: never-overwrite-an-incomplete-plan
title: Never overwrite an incomplete plan
summary: "Before writing a plan or a task list, check for unchecked tasks, update the same work in place and ask about different work."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document or a task list file may already exist.
conditions_does_not_apply_when: No plan file exists yet.
artifact_contract_output_type: plan-conflict-report
artifact_contract_required_data:
  - the existing plan
  - its unchecked tasks
  - the decision taken
artifact_contract_verified_by: no incomplete plan was overwritten without an explicit decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/plan.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-todo.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/check-todos.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never overwrite an incomplete plan

**Never overwrite an incomplete plan.**
Before writing the plan document or the task list, check whether they already exist and still contain unchecked tasks:

- Same work being replanned (the user asked to revise or extend this plan) → update the existing files in place.
- Different work → **stop and ask.** The unchecked tasks may be mid-build in another session. Do not delete, overwrite, or rename the existing files on your own; present the conflict and let the user decide (finish the old plan first, explicitly discard it, or tell you where the new plan should go).

The same rule applies to an external task list target: never bulk-close or delete another plan's open tracker items to make room for new ones.

Save the plan to tasks/plan.md and task list to tasks/todo.md.
If tasks/plan.md or tasks/todo.md already exists with unchecked tasks for different work, stop and ask before writing — never silently overwrite an incomplete plan.
If the read that would produce the new content failed or returned an unusable value, do NOT touch the existing content - leave it exactly as-is and continue to the next step.
A partial or malformed result must never overwrite a good existing section.
<!-- vpmodule:atom:end never-overwrite-an-incomplete-plan -->