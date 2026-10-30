---
instruction_id: challenge-the-need-for-a-skill
title: Challenge the need for a skill
summary: "A thin idea is pushed back on: a one-off, a project convention, a constraint a script could check, each belongs somewhere else."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request would be turned into a reusable skill or tool.
conditions_does_not_apply_when: The user has already established that a reusable skill is wanted.
artifact_contract_output_type: challenge
artifact_contract_required_data:
  - the reason it is not a skill
  - where the request belongs instead
artifact_contract_verified_by: "the reason it is not a skill, or the reason it is, is stated before the build starts"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Challenge the need for a skill
Push back where the idea is thin: is this a skill at all or a one-off the user could ask for directly; a project convention, which belongs in the project's instructions file; a constraint a script could check, which belongs in a script; what input would break it; what it should require or recommend from the skills already installed. A skill whose job is to hold what the user would otherwise type every time, a format, a preference, a convention, a persona, is warranted by that alone; do not test whether the model can follow the instruction when given it, since nobody doubts that.
