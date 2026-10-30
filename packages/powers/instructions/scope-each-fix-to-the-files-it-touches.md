---
instruction_id: scope-each-fix-to-the-files-it-touches
title: Scope each fix to the files it touches
summary: Only the files the finding names are changed; a new file appears only when the fix requires one.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - scope-routing
conditions_applies_when: A finding is fixed.
conditions_does_not_apply_when: The finding explicitly asks for a new file.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the files changed
artifact_contract_verified_by: no file outside the finding was modified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope each fix to the files it touches
DO NOT modify files unrelated to the finding — scope each fix narrowly to the issue at hand.
DO NOT create new files unless the fix explicitly requires it (e.g., missing import file, missing test file that reviewer suggested).
Collect ALL file paths mentioned in the finding
