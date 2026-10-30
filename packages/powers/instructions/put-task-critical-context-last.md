---
instruction_id: put-task-critical-context-last
title: Put the task-critical context last
summary: "Keep stable rules and specs at the start of the context and place the active task material last, closest to the work."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Context is assembled for a session or a task.
conditions_does_not_apply_when: The context fits in one turn and nothing is at risk of being forgotten.
artifact_contract_output_type: context-ordering
artifact_contract_required_data:
  - the background material placed first
  - the active task material placed last
artifact_contract_verified_by: the active task material is the last thing before the point of use
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Put the task-critical context last

Put the most task-critical content **last** in context. Models recall content at the start and end of the window more reliably than the middle (the lost-in-the-middle effect — Liu et al., 2023). Keep stable rules and specs at the start; put the active task material last, closest to the generation point:

```
← session start                              generation point →
[background: rules, specs, architecture]  [working: current file, error, task]
```
