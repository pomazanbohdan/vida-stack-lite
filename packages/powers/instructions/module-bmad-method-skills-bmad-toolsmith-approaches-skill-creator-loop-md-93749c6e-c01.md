---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-approaches-skill-creator-loop-md-93749c6e-c01"
title: "bmad-method: skills/bmad-toolsmith/approaches/skill-creator-loop.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/approaches/skill-creator-loop.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/approaches/skill-creator-loop.md\"}"
atom_ids:
  - make-every-declared-override-reach-the-place-it-changes
  - make-the-description-the-whole-trigger
atom_count: 2
atoms: "[{\"atom_id\":\"make-every-declared-override-reach-the-place-it-changes\",\"file_sha256\":\"ed9f633019a3f3654ea029dcf9e73c26ad8d925f0aa3d9183763b55faede50e1\",\"content_sha256\":\"ba39df90b67eb7b6bebaee7831027e8f74f0aa850a4e03b1705c56bc2772bad9\",\"file_bytes\":2250,\"body_bytes\":719},{\"atom_id\":\"make-the-description-the-whole-trigger\",\"file_sha256\":\"1e69aad21686f186d3f809fc2e7f40761360d7a018792148ab2609d322e866d0\",\"content_sha256\":\"f3fc714f25bc435af3cf6150a64882df76145b52e0aceef6c624bd83388e26d8\",\"file_bytes\":2748,\"body_bytes\":1172}]"
carrier_sha256: 456d000907ed80d328b17acddf3c1a82355d80c5aa020dfd6daff09bc2e0aeed
carrier_bytes: 5299
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-every-declared-override-reach-the-place-it-changes -->
---
instruction_id: make-every-declared-override-reach-the-place-it-changes
title: Make every declared override reach the place it changes
summary: "Every declared value has to reach the place it changes, a value that is declared and hardcoded makes every override a silent no-op, and a switch means the author never decided."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A value can be overridden by whoever installs or uses the tool.
conditions_does_not_apply_when: Nothing in the tool can be changed without editing it.
artifact_contract_output_type: override-contract
artifact_contract_required_data:
  - the declared values
  - the place each one reaches
  - the values a team would want to change
artifact_contract_verified_by: "no declared value is hardcoded in the body, and every value a team would change is declared"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-customization.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/standards.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/skill-creator-loop.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make every declared override reach the place it changes
The bar: every declared value reaches the place it changes; every value a team would override is declared.
Declared and hardcoded: the table declares a scalar the body hardcodes. Important; every override is a silent no-op.
In a rendered skill or rendered agent, a `[workflow]` key no rendered source inserts with `{{ workflow.<key> }}` is declared and hardcoded.
Not resolved: no resolution call in activation, or tokens naming no key. Important; overrides never reach the model.
Boolean toggles:
- one minor, three or more important; a switch means the author never decided
The customization decision: does a team need to swap a rule or step without forking?
<!-- vpmodule:atom:end make-every-declared-override-reach-the-place-it-changes -->
<!-- vpmodule:atom:begin make-the-description-the-whole-trigger -->
---
instruction_id: make-the-description-the-whole-trigger
title: Make the description the whole trigger
summary: "The description is all the model sees when it chooses, so it is the whole trigger and it is paid on every session, fired or not."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The description of a skill or an instruction is written or revised.
conditions_does_not_apply_when: The guidance is always loaded together with the task.
artifact_contract_output_type: trigger-description
artifact_contract_required_data:
  - the summary of what it does
  - the quoted phrases a user types
  - the anchors it names
  - the length
artifact_contract_verified_by: "the description has its two parts, names anchors, and stays under the length the validator enforces"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-trigger.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/skill-creator-loop.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the description the whole trigger
The description is all the model sees when deciding whether to load the skill, so it is the whole trigger, and every character of it is paid on every session whether the skill fires or not.
Two parts: a five-to-eight-word summary of what the skill does, in the third person, then `Use when the user says 'phrase' or 'phrase'.` with the quoted phrases a user types.
Anchors beat adjectives: file types, tool names, artifact names.
Each phrase covers a different situation; two wordings of one situation are one phrase.
1024 characters is the ceiling the validator enforces, never a target.
A skill only ever invoked by its name, as a slash command, needs no trigger at all: where the host honours `disable-model-invocation: true`, set it and let the description be one line for the human.
Over 1024 characters, or no `Use when`:
- Important; the validator fails it too
Make the description deliberately specific, because widening one that stays quiet is easier than narrowing one that fires everywhere.
Look for trigger phrases like "Use when" or "Use if" — their absence suggests the description only says _what_ but not _when_.
<!-- vpmodule:atom:end make-the-description-the-whole-trigger -->