---
instruction_id: record-the-assumptions-you-had-to-infer
title: Record the assumptions you had to infer
summary: An unattended run asks nothing and infers what it must; every assumption it made goes into the result.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A run works without a person to ask and an input was missing.
conditions_does_not_apply_when: Every input was given.
artifact_contract_output_type: assumption-record
artifact_contract_required_data:
  - the inferred topic
  - the invented goal
  - the assumptions list
artifact_contract_verified_by: every value the run had to infer is listed in the result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-brainstorming/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Record the assumptions you had to infer
Do not ask questions; do not greet.
Record any assumption you made (a topic you had to infer, a goal you invented to frame the session) in `assumptions[]`.
