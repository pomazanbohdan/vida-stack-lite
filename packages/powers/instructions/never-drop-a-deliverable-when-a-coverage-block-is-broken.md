---
instruction_id: never-drop-a-deliverable-when-a-coverage-block-is-broken
title: Never drop a deliverable when a coverage block is broken
summary: "A coverage record that cannot be read is reported and its entries still become checkpoints; an entirely covered set produces one confirmation, never an empty list."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A coverage record of the finished work is read and it may be malformed.
conditions_does_not_apply_when: The coverage record is complete and readable.
artifact_contract_output_type: coverage-checkpoints
artifact_contract_required_data:
  - the automatically covered deliverables
  - the human checkpoints
  - the errors found in the record
artifact_contract_verified_by: no deliverable was dropped and the automatically covered ones were listed instead of silently skipped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never drop a deliverable when a coverage block is broken
Surface any `errors[]` to the user (malformed coverage block) but still treat their entries as human checkpoints — **never drop a deliverable** (fail-safe).
If `all_auto_covered` is `true` (every entry auto-passed, including the `coverage: []` case) → do NOT generate zero checkpoints; present a **single confirmation summary** listing the auto-covered deliverables with their covering tests and ask the user to confirm.
Each `auto_passed[]` entry is recorded in UAT.md as `result: pass`, `source: automated` (see `create_uat_file`) — **do not present it as a checkpoint.**
