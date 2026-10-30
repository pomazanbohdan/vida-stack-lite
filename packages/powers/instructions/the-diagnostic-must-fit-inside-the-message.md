---
instruction_id: the-diagnostic-must-fit-inside-the-message
title: The diagnostic must fit inside the message
summary: "A check surfaces only the tail of its output, so the diagnostic it writes has to be concise; nothing downstream may grep the long output instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A check reports its result as a message that carries the tail of the command output.
conditions_does_not_apply_when: The whole output is written to a file the reader opens.
artifact_contract_output_type: check-message
artifact_contract_required_data:
  - the concise diagnostic
  - the surface the message carries
artifact_contract_verified_by: the diagnostic stands on its own inside the message without the full output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/command-exit-zero-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# The diagnostic must fit inside the message
Only the last 2000 chars of stderr/stdout surface in the gate `message`. Emit a concise diagnostic; don't rely on grepping long output downstream.
