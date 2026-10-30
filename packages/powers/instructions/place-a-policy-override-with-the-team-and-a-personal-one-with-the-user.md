---
instruction_id: place-a-policy-override-with-the-team-and-a-personal-one-with-the-user
title: Place a policy override with the team and a personal one with the user
summary: "A policy, an org convention and a compliance rule are a committed team override; a personal tone, a private fact and a shortcut are a user override, and a committed one reaches the teammates on their next pull."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: An override file is about to be written.
conditions_does_not_apply_when: The placement was named in the request.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the chosen layer
  - the character that decided it
artifact_contract_verified_by: the placement was confirmed before the file was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Place a policy override with the team and a personal one with the user
- team, committed. Policies, org conventions, compliance.
- user, gitignored. Personal tone, private facts, shortcuts.
Default by character (policy → team, personal → user), confirm before writing.
Committed, so teammates get a change on their next pull.
