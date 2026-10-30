---
instruction_id: recommend-the-next-step-from-what-exists
title: Recommend the next step from what exists
summary: "Recommend from what is installed and from the state that exists, say plainly when a step has no installed capability instead of inventing a substitute, and resume at the earliest affected step rather than replaying unaffected work."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: The next step of the work maps to a capability that may or may not be present.
conditions_does_not_apply_when: You are producing that capability yourself in this session.
artifact_contract_output_type: next-step
artifact_contract_required_data:
  - the installed capabilities
  - the recommended one
  - the state that exists
artifact_contract_verified_by: a step with no installed capability is named as missing rather than replaced by an invention
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Recommend the next step from what exists
A project may hold only some of these skills: recommend from what is installed, and say plainly when a step has no installed skill rather than inventing a substitute.
Read the state before recommending: which of the outputs named above exist, and what the codebase, git history, and the user say is done.
A file's presence, or a plan with `status: done`, is evidence the skill ran, not proof the work is finished or current.
Mid-path, recommend the next unfinished step of the route the user is on, not a restart
then resume at the earliest affected step. Do not replay unaffected work.
