---
instruction_id: measure-the-uncommitted-files-never-assert-them
title: "Measure the uncommitted files, never assert them"
summary: "The list of uncommitted files comes from an actual call, never from memory, and it is never rounded to empty."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verification-before-completion
conditions_applies_when: A handoff or a status record lists the files that are changed but not committed.
conditions_does_not_apply_when: The working copy is clean and the list is empty.
artifact_contract_output_type: working-copy-measurement
artifact_contract_required_data:
  - the measurement that was taken
  - the entries it produced
  - the elided count when the list was truncated
artifact_contract_verified_by: the list came from a call and a non-empty result was never rounded to empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pause-work.md
status: active
revision: 1
---

# Measure the uncommitted files, never assert them
Populate it from an actual call, not from memory
NEVER round it to empty
One array entry per line ("XY path"); truncate the list at 50 entries and note the
elided count, but NEVER round it to empty — a non-empty porcelain output is the single
most load-bearing fact a resume session needs
