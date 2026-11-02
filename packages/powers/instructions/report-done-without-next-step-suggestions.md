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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/fast.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Report done without next-step suggestions
Report completion:
No next-step suggestions. No workflow routing. Just done.
