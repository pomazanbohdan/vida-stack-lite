---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-skill-md-76e95edc-c01"
title: "bmad-method: skills/bmad/SKILL.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad/SKILL.md\"}"
atom_ids:
  - answer-only-from-what-the-installed-modules-say
  - load-the-reference-that-matches-the-request
  - recommend-the-next-step-and-say-why
atom_count: 3
atoms: "[{\"atom_id\":\"answer-only-from-what-the-installed-modules-say\",\"file_sha256\":\"2d3408078bd1bc7ad8d00ac03fd71c80f9bec62966268585f79bd44ad2dbb93c\",\"content_sha256\":\"504e281f0c3a7f16b53bb53722f2ebaa6ea194c8b12aeb5f70b3c6355bd6e8df\",\"file_bytes\":1673,\"body_bytes\":349},{\"atom_id\":\"load-the-reference-that-matches-the-request\",\"file_sha256\":\"06efc6987888aba1c8c7d9b7aa1badbc75876050c58379c7003744933f5580b9\",\"content_sha256\":\"06a28f35dfb2cb7171bb1fac02232021027de936adff9c3e6b2d7ae46e7a1874\",\"file_bytes\":1512,\"body_bytes\":328},{\"atom_id\":\"recommend-the-next-step-and-say-why\",\"file_sha256\":\"8c6c49360d60d9d6fd4e7b7540332952529d3ee5520463488665137cfe37ad67\",\"content_sha256\":\"dd28370adf4b34ce67479d5b5557a6e1b4b08411b3ef9671c78eb6f49574810f\",\"file_bytes\":1565,\"body_bytes\":510}]"
carrier_sha256: 3c542f896db5f46daa37a1aa3bd8080f75dae9d89cfba724eebd94ceb514fa4d
carrier_bytes: 5173
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-only-from-what-the-installed-modules-say -->
---
instruction_id: answer-only-from-what-the-installed-modules-say
title: Answer only from what the installed modules say
summary: "Every help answer is taken from the installed modules own help, never from memory or from the shape of a skill name; a project holds only some of the modules, so the recommendation comes from what is installed."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A question about the method or about the installed modules has to be answered.
conditions_does_not_apply_when: "The question is answered by running an action, not by giving help."
artifact_contract_output_type: advisor-answer
artifact_contract_required_data:
  - the help of the installed module that answers the question
artifact_contract_verified_by: the answer is traceable to the installed help and not to recollection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/help.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Answer only from what the installed modules say
Every help answer comes from the installed modules' own help, never from memory of the method or inference from skill names.
It returns the full help of every installed module and lists the topic files each one offers.
A project may hold only some of these skills: recommend from what is installed.
<!-- vpmodule:atom:end answer-only-from-what-the-installed-modules-say -->
<!-- vpmodule:atom:begin load-the-reference-that-matches-the-request -->
---
instruction_id: load-the-reference-that-matches-the-request
title: Load the reference that matches the request
summary: An action request loads its own reference; the general help is loaded only when a question arrives.
capability_tags:
  - consult-guidance
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A request arrives that maps to one of the known actions.
conditions_does_not_apply_when: The request is a plain question with no action behind it.
artifact_contract_output_type: advisor-answer
artifact_contract_required_data:
  - the reference that was loaded
  - the outcome of the action
artifact_contract_verified_by: the help section was not loaded before the action was finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body routes generic request types to reference material but identifies no substantive task domain; a domain label would depend on context outside the body and conditions.
---

# Load the reference that matches the request
When the request is only one of these actions, load its reference and follow it.
Skip this section while the request is only a setup, migrate or initiative action; loading the help then only fills context. If the user later asks a question or wants advice, come back and follow it.
<!-- vpmodule:atom:end load-the-reference-that-matches-the-request -->
<!-- vpmodule:atom:begin recommend-the-next-step-and-say-why -->
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
<!-- vpmodule:atom:end recommend-the-next-step-and-say-why -->