---
instruction_id: load-the-index-and-only-the-rules-you-need
title: Load the index and only the rules you need
summary: Project skills are read as a lightweight index; the individual rule files and the large agent instructions are loaded only when the task needs them.
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Project-defined skills exist for the repository.
conditions_does_not_apply_when: The repository defines no skills.
artifact_contract_output_type: skill-index
artifact_contract_required_data:
  - the skills found
  - the index read for each
  - the rule files loaded
artifact_contract_verified_by: the index was read and only the needed rule files were loaded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/project-skills-discovery.md
status: active
revision: 1
---

# Load the index and only the rules you need
Before execution, check for project-defined skills and apply their rules
List available skills (subdirectories)
Read `SKILL.md` for each skill (lightweight index, typically ~130 lines)
Load specific `rules/*.md` files only as needed during the current task
Do NOT load full `AGENTS.md` files — they are large (100KB+) and cost significant context
