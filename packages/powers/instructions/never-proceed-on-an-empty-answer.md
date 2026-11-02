---
instruction_id: never-proceed-on-an-empty-answer
title: Never proceed on an empty answer
summary: An empty answer is retried once and then turned into a plain list; the run never continues on nothing.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A question was asked and the answer came back empty.
conditions_does_not_apply_when: The answer contains text.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the options
  - the retry count
artifact_contract_verified_by: the run did not continue on an empty answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/text.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Never proceed on an empty answer
Never proceed with empty input.
**Any other empty response:** retry once with the same parameters; if still empty, present options as a plain-text numbered list.
