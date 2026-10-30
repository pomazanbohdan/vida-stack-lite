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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-trigger.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/skill-creator-loop.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
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
