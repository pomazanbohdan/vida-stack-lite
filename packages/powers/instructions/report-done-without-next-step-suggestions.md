---
instruction_id: report-done-without-next-step-suggestions
title: Report done without next-step suggestions
summary: "The trivial route ends with what changed, the commit and the files, and no next steps and no routing."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The trivial route finished the work.
conditions_does_not_apply_when: The work went through a planning route.
artifact_contract_output_type: completion-report
artifact_contract_required_data:
  - what was changed
  - the commit
  - the changed files
artifact_contract_verified_by: the report carries no next steps and no routing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/fast.md
status: active
revision: 1
---

# Report done without next-step suggestions
Report completion:
No next-step suggestions. No workflow routing. Just done.
