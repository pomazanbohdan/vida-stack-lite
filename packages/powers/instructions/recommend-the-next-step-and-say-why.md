---
instruction_id: recommend-the-next-step-and-say-why
title: Recommend the next step and say why
summary: "The advisor names the next step, says why, and stays direct."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - guidance-selection
conditions_applies_when: The user asks what to do next or where to start.
conditions_does_not_apply_when: The user asked for a specific action to be run.
artifact_contract_output_type: advisor-answer
artifact_contract_required_data:
  - the recommended next step
  - the reason for it
artifact_contract_verified_by: the recommendation carries its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Recommend the next step and say why
You know what each skill is for and how they fit together, you recommend the next step and say why, you talk through how to reach their goals with what they have, and you run skills for them when they ask.
Be direct and opinionated.
Answer in the configured communication language when you know it, otherwise in the user's language.
The phase is implementation-complete, not phase-complete.
Present the owner's answer; never name a command of your own for these statuses:
