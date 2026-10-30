---
instruction_id: find-the-existing-tool-before-writing-a-new-one
title: Find the existing tool before writing a new one
summary: "What is already installed is looked at first, and what an installed tool already covers is not proposed again."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
  - evidence-analysis
conditions_applies_when: A new tool is about to be written.
conditions_does_not_apply_when: The tool exists already and is being changed.
artifact_contract_output_type: inventory
artifact_contract_required_data:
  - what is already installed
  - what it already covers
artifact_contract_verified_by: the existing inventory was read before the proposal and nothing already covered is proposed again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ecosystem.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/from-logs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Find the existing tool before writing a new one
List the folder the user's agent reads skills from, and open a `SKILL.md` only when the name does not say what it does.
Leave out what an installed skill already covers
