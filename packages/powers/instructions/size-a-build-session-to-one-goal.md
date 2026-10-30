---
instruction_id: size-a-build-session-to-one-goal
title: Size a build session to one goal
summary: "One session is one goal of roughly five hundred changed lines in a handful of files, started in a fresh chat; the session commits and never pushes."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A piece of work is about to be started as a single session.
conditions_does_not_apply_when: The work is a single edit the user is directing.
artifact_contract_output_type: session-plan
artifact_contract_required_data:
  - the one goal
  - the size of the change
  - the branch it runs on
artifact_contract_verified_by: the session ends with one goal delivered and a local commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size a build session to one goal
Size: one session is one goal, roughly 500 changed lines, not counting tests, in a handful of files.
Start it in a fresh chat.
It commits and never pushes.
