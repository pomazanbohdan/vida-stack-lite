---
instruction_id: write-the-cases-before-the-skill
title: Write the cases before the skill
summary: "The cases exist before the skill does, each rubric entry is a pass or fail condition, and the skill is aimed at the cases without quoting the grader."
capability_tags:
  - design-experiments
pattern_tags:
  - test-first-development
  - experiment-design
conditions_applies_when: The output of a tool can be checked objectively.
conditions_does_not_apply_when: The output cannot be checked against anything but taste.
artifact_contract_output_type: case-file
artifact_contract_required_data:
  - the inputs
  - the rubric entries
  - the state that reaches a mid-flow turn
  - the files the case needs
artifact_contract_verified_by: "the cases were confirmed with the user before the skill was written, and no rubric word appears in the skill"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/eval-first.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/eval-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write the cases before the skill
The cases exist before the skill does, so the skill is built to pass them and the passing run is on record.
Inputs are the user's real requests where they exist, as messy as they were typed.
Each rubric entry is a PASS or FAIL condition over the output, the transcript or the files, never a quality adjective.
A `state_prefix` reaches a mid-flow turn in one shot.
Show the file and confirm it with the user, because cases they do not believe in prove nothing to them.
aimed at the cases, never to the rubric word for word, because a skill that quotes its grader passes the test and fails the user.
Seed them from real requests and transcripts before inventing any, because invented cases come out homogeneous and easy.
Two or three realistic, messy inputs to start, with no rubric yet.
