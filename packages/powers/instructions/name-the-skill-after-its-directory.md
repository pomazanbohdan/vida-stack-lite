---
instruction_id: name-the-skill-after-its-directory
title: Name the skill after its directory
summary: "Name the skill in lowercase hyphenated form, match it to its directory, and treat a published name as an identifier others depend on."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill is named, renamed or published."
conditions_does_not_apply_when: "The name, the directory and the published form are already fixed."
artifact_contract_output_type: skill-name
artifact_contract_required_data:
  - skill name
  - directory name
  - owner of an alias when renamed
artifact_contract_verified_by: the name in the metadata matches the directory name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/skill-anatomy.md
status: active
revision: 1
---

# Name the skill after its directory
`name`: Lowercase, hyphen-separated. Must match the directory name.

Published names are compatibility identifiers.

In particular, a published name is the stable upstream name because other skills refer to it directly.

A downstream catalog may rename it, but that catalog owns the alias or migration mapping; downstream-only aliases are not maintained in this repository.

Skill directories: `lowercase-hyphen-separated`

Skill files: `SKILL.md` (always uppercase)

Supporting files: `lowercase-hyphen-separated.md`
