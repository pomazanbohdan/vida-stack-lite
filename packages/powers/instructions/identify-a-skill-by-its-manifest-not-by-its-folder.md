---
instruction_id: identify-a-skill-by-its-manifest-not-by-its-folder
title: "Identify a skill by its manifest, not by its folder"
summary: "A skill is identified by the manifest in its directory, and the directory name is the fallback when the manifest carries no name."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - verified-loading
conditions_applies_when: A set of skill directories is being inventoried.
conditions_does_not_apply_when: The directories have no manifests at all.
artifact_contract_output_type: skill-identity
artifact_contract_required_data:
  - the manifest that identifies the skill
  - the fallback name
  - the directories that are scanned
artifact_contract_verified_by: every skill was identified from its manifest with the directory name as the fallback
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/skills/discovery-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Identify a skill by its manifest, not by its folder
- Scan only subdirectories that contain `SKILL.md`.
- Read `name` and `description` from YAML frontmatter.
- Use the directory name when `name` is missing.
