---
instruction_id: write-the-description-as-a-summary-and-trigger-phrases
title: Write the description as a summary and trigger phrases
summary: "The description is the only trigger: it carries a short third-person summary and the quoted phrases a user would really type, one phrase per situation, under a hard length ceiling."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The description of a skill has to be written or revised.
conditions_does_not_apply_when: The skill is only ever invoked by name and never competes for a request.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the one-line summary
  - the trigger phrases
  - the situations the phrases cover
artifact_contract_verified_by: the router finds the skill from the words the user would type
compatibility_excludes:
  - optimize-guidance-triggers
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-description.md
status: active
revision: 1
---

# Write the description as a summary and trigger phrases
The description is the skill's only trigger.
The agent's router reads it, with every other installed skill's, and decides whether to load the skill.
It has two parts: a five-to-eight-word summary of what the skill does, in the third person, then `Use when the user says ...` with the quoted phrases a user would actually type.
Every installed description is paid on every session, so it stays that short; 1024 characters is the hard ceiling, not a target.
One phrase per situation; a synonym stack adds length and no reach.
Describe the user's problem, not the tool's symptom: "release notes from merged PRs", not "changelog generation".
a skill that must fire unasked describes the context instead
An agent is the exception to keeping it short.
Its `Use when` starts with the user asking for it by name, then lists the phrases of every capability built into it, since nothing else triggers those capabilities.
The summary stays short; the list does not.
A skill only ever called by name, such as a slash command, gets a one-line description
