---
instruction_id: ignore-generated-and-secret-files
title: Ignore generated and secret files
summary: "Commit generated files only when the project expects them, and keep build output, environment files and local settings out of the tree."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Files are about to be added to the tree or the ignore list is being set up.
conditions_does_not_apply_when: No file is being added and the ignore list is already in place.
artifact_contract_output_type: ignore-list
artifact_contract_required_data:
  - the generated files kept
  - the excluded paths
  - the ignore entries
artifact_contract_verified_by: the ignore list covers the standard exclusions and no secret or build output is tracked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Ignore generated and secret files

- **Commit generated files** only if the project expects them (e.g., `package-lock.json`, Prisma migrations)
- **Don't commit** build output (`dist/`, `.next/`), environment files (`.env`), or IDE config (`.vscode/settings.json` unless shared)
- **Have a `.gitignore`** that covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

"I don't need a .gitignore" | Until `.env` with production secrets gets committed. Set it up immediately.

No `.gitignore` in the project

Committing `node_modules/`, `.env`, or build artifacts
