---
instruction_id: forward-only-the-arguments-the-target-accepts
title: Forward only the arguments the target accepts
summary: Only the arguments the target accepts are forwarded; the freeform sentence is never passed whole.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A target operation is about to be invoked with arguments taken from a freeform request.
conditions_does_not_apply_when: The arguments are already a bare identifier the target accepts.
artifact_contract_output_type: dispatch-request
artifact_contract_required_data:
  - the arguments the target accepts
  - the extracted values
artifact_contract_verified_by: the freeform sentence was not forwarded whole
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/do.md
status: active
revision: 1
---

# Forward only the arguments the target accepts
**Invoke the chosen command with only the arguments it accepts.**
Do NOT pass the full freeform sentence wholesale.
extract the phase number / flags from the input; if none was provided, extract it from context
If the command takes no arguments, invoke it without arguments.
