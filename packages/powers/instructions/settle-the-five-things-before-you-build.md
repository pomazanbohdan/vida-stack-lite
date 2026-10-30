---
instruction_id: settle-the-five-things-before-you-build
title: Settle the five things before you build
summary: "Five things settle what a tool is for: its purpose, its consumer, its trigger phrases, the know-how it holds and whether its output can be checked."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A new tool or skill is about to be designed.
conditions_does_not_apply_when: The five things are already written down.
artifact_contract_output_type: settled-brief
artifact_contract_required_data:
  - what it gets done and for whom
  - who consumes the output and what must be true of it
  - the trigger phrases and the nearby requests it must stay quiet on
  - where the know-how lives
  - whether the output can be checked objectively
artifact_contract_verified_by: all five are answered before any file is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Settle the five things before you build
Five things settle a skill: what it gets done and for whom (two purposes are two skills); who or what consumes the output and what must be true of it for them to act without this conversation in the room, the one line that sets every bar; the phrases a user would type to reach it and the nearby requests it must stay quiet on; what it runs on and where the know-how lives that a model would not already have (a runbook, an incident, a transcript of doing it by hand, the corrections the user keeps making); and whether the output can be checked objectively, which decides how much the build leans on evals.
