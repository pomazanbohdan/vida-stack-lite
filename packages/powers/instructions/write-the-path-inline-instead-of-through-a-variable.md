---
instruction_id: write-the-path-inline-instead-of-through-a-variable
title: Write the path inline instead of through a variable
summary: "A path to a file of the same unit is written inline where it is used, never held in a variable."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file refers to a file that belongs to the same unit.
conditions_does_not_apply_when: The path points outside the unit and is anchored to a configured root.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the path
  - where it is written
  - the exception when one applies
artifact_contract_verified_by: no variable holds a path to a file of the same unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 1
---

# Write the path inline instead of through a variable
Variables must not store paths to files within the same skill.
These paths should be hardcoded as relative paths inline where used.
This applies to YAML frontmatter variables AND markdown body variable assignments (e.g., `` `template` = `./template.md` `` under a `### Paths` section).
If a path variable is used in 4+ locations across multiple files and the path is non-trivial, a variable MAY be acceptable.
