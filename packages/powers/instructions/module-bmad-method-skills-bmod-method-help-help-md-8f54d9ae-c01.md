---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-help-md-8f54d9ae-c01"
title: "bmad-method: skills/bmod-method/help/help.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/help.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/help.md\"}"
atom_ids:
  - recommend-the-next-step-from-what-exists
  - recommend-the-smallest-path-that-fits-the-work
atom_count: 2
atoms: "[{\"atom_id\":\"recommend-the-next-step-from-what-exists\",\"file_sha256\":\"68123fd2f3affe901a8aec7c12b3edd78f417ca67aadb9a4ed53b7061f0c6046\",\"content_sha256\":\"c0d2b5210bbde33a647fc52b9374c36f4237681d4633325a3048c11f12afee3a\",\"file_bytes\":1871,\"body_bytes\":630},{\"atom_id\":\"recommend-the-smallest-path-that-fits-the-work\",\"file_sha256\":\"8e680f75d9ed06fd830e828c02ffe18b4841a178330643a17e65a689f2296d7f\",\"content_sha256\":\"8e7589c01dd646139219546ab09c820bde061dda3dee8ca9724ec208f0e2f4c2\",\"file_bytes\":1728,\"body_bytes\":573}]"
carrier_sha256: dc627244918f2ad0d08fedc8b3f1538cd97d616d9643408d82ccf8bb64091d00
carrier_bytes: 3886
revision: 1
status: active
---
<!-- vpmodule:atom:begin recommend-the-next-step-from-what-exists -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/help.md
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
<!-- vpmodule:atom:end recommend-the-next-step-from-what-exists -->
<!-- vpmodule:atom:begin recommend-the-smallest-path-that-fits-the-work -->
---
instruction_id: recommend-the-smallest-path-that-fits-the-work
title: Recommend the smallest path that fits the work
summary: "Recommend the smallest path that safely fits the work instead of walking through every step; the phases describe the kind of help given, not a sequence to complete, and the work is done when the intent is satisfied."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "The next step for the user's work has to be chosen."
conditions_does_not_apply_when: The user has already chosen the step.
artifact_contract_output_type: next-step
artifact_contract_required_data:
  - the smallest path
  - what it covers
  - what it leaves out
artifact_contract_verified_by: the recommended path is the smallest one that safely fits the work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Recommend the smallest path that fits the work
Recommend the smallest path that safely fits the work; never march the user through every skill.
The four phases are analysis (ideation, research, is it worth building), planning (what exactly, and in what slices), implementation (build it), and validation (is it right).
They describe what kind of help a skill gives.
They are not a mandatory sequence to complete.
The work is complete when the intent is satisfied, its chosen checks pass, and no chosen review leaves material findings open - not when every skill has run.
<!-- vpmodule:atom:end recommend-the-smallest-path-that-fits-the-work -->