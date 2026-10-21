---
instruction_id: pass-the-response-language-into-every-spawned-agent
title: Pass the response language into every spawned agent
summary: "A configured response language covers every user-facing output of the run, and it is passed into every spawned agent so their output stays in that language too."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A response language is configured for the run.
conditions_does_not_apply_when: No response language is configured.
artifact_contract_output_type: language-directive
artifact_contract_required_data:
  - the configured language
  - the prompts that carry it
artifact_contract_verified_by: every spawned agent received the language and every user-facing output is in it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/response-language-directive.md
status: active
revision: 1
---

# Pass the response language into every spawned agent
**If `response_language` is set**
ALL user-facing output of this workflow MUST be in that language - narration between tool calls, status updates, progress notes, findings, banners, report prose,
questions (option menu or plain text),
and summaries. Technical terms, code, file paths, commands, and identifiers stay in English.
Pass `response_language: {value}` into every spawned subagent prompt so any user-facing output they produce stays in the configured language.
