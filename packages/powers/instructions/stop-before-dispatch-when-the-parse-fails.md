---
instruction_id: stop-before-dispatch-when-the-parse-fails
title: Stop before dispatch when the parse fails
summary: "When the input cannot be parsed nothing is dispatched: the error of the parser is shown verbatim and the run stops."
capability_tags:
  - execute-plan
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A list of items is parsed before the batch starts.
conditions_does_not_apply_when: The list parsed cleanly.
artifact_contract_output_type: parse-failure-report
artifact_contract_required_data:
  - the error of the parser
  - the decision that nothing was dispatched
artifact_contract_verified_by: the parser error was shown and no worker was dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/batch-init.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop before dispatch when the parse fails
the inline list must land on disk first
write it to a scratch file under
Print the CLI's error message verbatim and STOP.
Do not dispatch anything.
