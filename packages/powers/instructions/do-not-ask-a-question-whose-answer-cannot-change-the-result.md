---
instruction_id: do-not-ask-a-question-whose-answer-cannot-change-the-result
title: Do not ask a question whose answer cannot change the result
summary: A question whose answer would be discarded is not asked.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A step is about to ask the user something and the answer would not change what the step produces.
conditions_does_not_apply_when: The answer decides what the step writes or does.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the step that ran without a question
artifact_contract_verified_by: no question was asked whose answer was discarded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 1
---

# Do not ask a question whose answer cannot change the result
can change its result — and none of them has a text-mode fallback, so an unattended run would stop on an answer that is discarded.
