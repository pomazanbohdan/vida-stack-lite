---
instruction_id: separate-the-system-prompt-from-the-user-prompt-and-bound-the-output
title: Separate the system prompt from the user prompt and bound the output
summary: "The system instruction and the user instruction are written apart, few-shot examples are placed deliberately, and the output length is bounded explicitly."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Prompt handling is described for a model-backed feature.
conditions_does_not_apply_when: No model call is part of the work.
artifact_contract_output_type: implementation-guide
artifact_contract_required_data:
  - the system prompt
  - the user prompt
  - the output bound
artifact_contract_verified_by: the output bound is set explicitly and the two prompt roles are separated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 1
---

# Separate the system prompt from the user prompt and bound the output
System vs. user prompt separation; few-shot: inline vs. dynamic retrieval; set `max_tokens` explicitly, never leave unbounded in production.
stream vs. await (stream for UX, await for structured output validation)
