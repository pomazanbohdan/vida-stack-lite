---
instruction_id: branch-the-cause-across-categories-and-answer-the-and-gate
title: Branch the cause across categories and answer the and-gate
summary: Candidate causes are enumerated in more than one category and the question of whether several conditions must hold together is answered.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A hypothesis about the cause is formed.
conditions_does_not_apply_when: The failure is already explained by a single confirmed mechanism.
artifact_contract_output_type: cause-analysis
artifact_contract_required_data:
  - the candidate causes per category
  - the and-gate answer
artifact_contract_verified_by: at least two categories were considered and the and-gate was answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Branch the cause across categories and answer the and-gate
Branch, don't chain — at hypothesis formation (so it's done before the Phase 4 commit), enumerate candidate causes across ≥2 Ishikawa categories (code / config / environment / data) and answer the AND-gate check
cause in a DIFFERENT category — single-category is not a branch
Single-cause is fine when the AND-gate is no — but you must have checked.
