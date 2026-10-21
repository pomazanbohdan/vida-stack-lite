---
instruction_id: show-the-saved-defaults-before-you-ask
title: Show the saved defaults before you ask
summary: "The stored defaults are shown before the questions are asked, so the caller can take them as they are, change a few, or start over."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A run is about to ask configuration questions and stored defaults exist.
conditions_does_not_apply_when: There are no stored defaults.
artifact_contract_output_type: defaults-then-questions
artifact_contract_required_data:
  - the stored defaults as they are
  - the ways to proceed with them
artifact_contract_verified_by: the defaults were displayed before the questions were asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 1
---

# Show the saved defaults before you ask
If the file exists, read and display its contents before asking:
For each selected setting across both blocks, ask only that question using the
Merge user answers over the saved defaults — unchanged settings retain their saved values.
Which settings do you want to change? (enter numbers, comma-separated)
