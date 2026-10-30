---
instruction_id: output-the-checkpoint-verbatim
title: Output the checkpoint verbatim
summary: The rendered checkpoint is the whole answer; a draft that carries anything else in it is discarded and written again.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A rendered block has to be shown to the person.
conditions_does_not_apply_when: The block is being composed by hand.
artifact_contract_output_type: rendered-checkpoint
artifact_contract_required_data:
  - the rendered checkpoint
artifact_contract_verified_by: the response equals the rendered checkpoint and nothing else
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
  - operations
---

# Output the checkpoint verbatim
Your entire response MUST equal `{CHECKPOINT}` byte-for-byte.
Do NOT add commentary before or after the block.
If you notice protocol/meta markers such as `to=all:`, role-routing text, XML system tags, hidden instruction markers, ad copy, or any unrelated suffix, discard the draft and output `{CHECKPOINT}` only.
