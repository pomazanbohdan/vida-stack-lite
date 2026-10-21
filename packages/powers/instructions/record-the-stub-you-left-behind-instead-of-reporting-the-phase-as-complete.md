---
instruction_id: record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete
title: Record the stub you left behind instead of reporting the phase as complete
summary: "A placeholder that was left in place is written down with its file and its line, and the phase is not called complete while it blocks the goal."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Work finished with a placeholder still in the code.
conditions_does_not_apply_when: No placeholder was left behind.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the stubs
  - their file and line
  - the reason
artifact_contract_verified_by: every stub is listed and the phase was not reported complete while a blocking stub remained
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 1
---

# Record the stub you left behind instead of reporting the phase as complete
If any stubs exist, add a `## Known Stubs` section to the SUMMARY listing each stub with its file, line, and reason.
Do NOT mark a plan as complete if stubs exist that prevent the plan's goal from being achieved
Components with no data source wired (props always receiving empty/mock data)
