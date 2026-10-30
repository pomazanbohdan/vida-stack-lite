---
instruction_id: skip-the-empty-step-silently
title: Skip the empty step silently
summary: A step with nothing to do is skipped without a message and without a question.
capability_tags:
  - communicate-concisely
pattern_tags:
  - empty-result-policy
conditions_applies_when: A step looks for items that may not exist.
conditions_does_not_apply_when: The step has something to do.
artifact_contract_output_type: silent-skip
artifact_contract_required_data:
  - the fact that the step was skipped
artifact_contract_verified_by: no message and no prompt is emitted for an empty step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/list-seeds.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Skip the empty step silently
If no seed files exist: Skip this step silently - do not print any message or prompt.
If no seeds match: Skip silently - do not prompt the user.
If no pending todos exist: Skip this step silently.
