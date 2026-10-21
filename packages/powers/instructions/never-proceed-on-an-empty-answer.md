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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/text.md
status: active
revision: 1
---

# Never proceed on an empty answer
Never proceed with empty input.
**Any other empty response:** retry once with the same parameters; if still empty, present options as a plain-text numbered list.
