---
instruction_id: check-the-recurring-mistakes-and-workflow-learnings-before-writing
title: Check the recurring mistakes and the workflow learnings before writing
summary: "Before a change is written, the file records the mistakes that keep recurring and the patterns the workflow has already learned are read first."
capability_tags:
  - consult-guidance
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A test, a shell script, a changeset, a document, a command or a workflow file is about to be written."
conditions_does_not_apply_when: The repository keeps no record of recurring mistakes or learned patterns.
artifact_contract_output_type: prior-mistakes-check
artifact_contract_required_data:
  - the recurring mistakes that apply
  - the workflow learnings that apply
  - the file that was written afterwards
artifact_contract_verified_by: the recurring mistakes and the learned patterns were checked before the file was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/agents/domain.md
status: active
revision: 1
---

# Check the recurring mistakes and the workflow learnings before writing
- **Recurring PR mistakes** — CodeRabbit findings that recur; check before writing tests, shell scripts, changesets, or docs
- **Workflow learnings** — patterns learned from triage + PR cycles; check before writing new command/workflow files or test paths
