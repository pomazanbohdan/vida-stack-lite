---
instruction_id: anchor-a-path-outside-the-unit-to-a-configured-root
title: Anchor a path outside the unit to a configured root
summary: "A path that leaves the unit is anchored to a configured root, never to an absolute or home-relative path."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file refers to a file or a script that lies outside the unit.
conditions_does_not_apply_when: The reference stays inside the unit.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the referenced target
  - the root it is anchored to
  - the forms that are refused
artifact_contract_verified_by: "no absolute, home-relative or bare outside path survives in the unit"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Anchor a path outside the unit to a configured root
References to files outside the skill directory must use `{project-root}/...` or a config-derived path (e.g., `{output_folder}/...`).
A skill runs its own scripts through `{skill-root}`.
Flag absolute paths, home-relative paths (`~/`), or bare paths that resolve outside the skill.
Replace with `{project-root}/...` or the appropriate config value.
