---
instruction_id: exclude-the-planning-lock-and-generated-files-from-the-review-scope
title: "Exclude the planning, lock and generated files from the review scope"
summary: "Planning documents, lock files and generated output are left out of the review, while the repository's own prose files stay in."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The list of files to review is filtered.
conditions_does_not_apply_when: No file filter is applied because the file list was supplied as-is.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the excluded file classes
artifact_contract_verified_by: "planning, lock and generated files are excluded and prose files are not excluded wholesale"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Exclude the planning, lock and generated files from the review scope
Do NOT exclude all `.md` files — commands, workflows, and agents are source code in this codebase
Lock files: `package-lock.json`, `yarn.lock`, `Gemfile.lock`, `poetry.lock`
Generated files: `*.min.js`, `*.bundle.js`, `dist/`, `build/`
Planning markdown: `ROADMAP.md`, `STATE.md`, `*-SUMMARY.md`, `*-VERIFICATION.md`, `*-PLAN.md`
