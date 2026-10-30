---
instruction_id: describe-the-current-state-only
title: Describe the current state only
summary: "The description says what the code is, never what it was or what was considered, and it is read rather than guessed."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The current behaviour of a repository is documented.
conditions_does_not_apply_when: The document records a decision and its history.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the current state
artifact_contract_verified_by: no temporal wording and every statement was read from a file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Describe the current state only
Write current state only: Describe only what IS, never what WAS or what you considered. No temporal language.
BE THOROUGH. Explore deeply. Read actual files. Don't guess.
