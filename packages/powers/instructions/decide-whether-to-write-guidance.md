---
instruction_id: decide-whether-to-write-guidance
title: Decide whether guidance should exist at all
summary: "Create guidance only when a technique recurs across projects and others would benefit; steer one-off, project-specific, and mechanical rules elsewhere."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You are deciding whether to create new guidance.
conditions_does_not_apply_when: The guidance already exists and only needs an edit.
artifact_contract_output_type: guidance-decision
artifact_contract_required_data:
  - recurrence across tasks
  - portability beyond one project
  - benefit to other agents
  - decision
artifact_contract_verified_by: reuse case exists beyond one task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Decide whether guidance should exist at all
Create guidance when the technique wasn't intuitively obvious to you.
Create it when you would reference it again across projects.
Create it when the pattern applies broadly, not only to one project.
Create it when others would benefit.
Do not create guidance for one-off solutions.
Do not create it for standard practices well documented elsewhere.
Do not create it for project-specific conventions; put those in the project's instructions file.
Do not create it for mechanical constraints.
If the constraint is enforceable with a regex or validation, automate it.
A skill is a reference guide for proven techniques, patterns, or tools.
Skills help future agents find and apply effective approaches.
Skills are reusable techniques, patterns, tools, and reference guides.
Skills are NOT narratives about how you solved a problem once.
Do not write a narrative about how you solved a problem once.
If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.
