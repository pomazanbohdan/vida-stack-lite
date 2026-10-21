---
instruction_id: display-the-tool-output-verbatim
title: Display the tool output verbatim
summary: The numbers shown are the ones the tool printed and are not recomputed.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A tool has already computed the values that the report must show.
conditions_does_not_apply_when: The values are being computed by the agent itself.
artifact_contract_output_type: review-summary
artifact_contract_required_data:
  - the tool output
artifact_contract_verified_by: "the shown numbers are the ones the tool printed, not recomputed ones"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 1
---

# Display the tool output verbatim
Display that block's stdout verbatim.
Do not re-derive any of it — a number the shell computed and did not print is gone once the fence closes
