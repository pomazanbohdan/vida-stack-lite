---
instruction_id: match-the-language-of-the-session
title: Match the language of the session
summary: The refinement is written in the communication language of the surrounding session; every user-facing output follows it and technical terms stay in English.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A result is handed back into a running session.
conditions_does_not_apply_when: The result goes to a store with a fixed language of its own.
artifact_contract_output_type: language-matched-result
artifact_contract_required_data:
  - the language of the session
  - the language of the result
artifact_contract_verified_by: the result uses the communication language of the surrounding session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/brief.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/default.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/full.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/full.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/mvp-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-workspace.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-response-language.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/response-language-directive.md
status: active
revision: 2
---

# Match the language of the session
Work in the surrounding session's communication language.

The language covers every user-facing prose: narration between tool calls, status updates, progress notes, findings, questions, prompts and explanations included.
Technical terms, code, file paths and subagent prompts stay in English - only user-facing output is translated.
User-facing orchestrator output (questions, narration, report-template prose) in `{response_language}`; technical terms, code, file paths, and subagent prompts stay in English.
Pass `response_language: {value}` into every spawned subagent prompt so any user-facing output they produce stays in the configured language.
are a structural source, not literal output to copy verbatim — render their prose translated into `{response_language}` while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged.
ALL user-facing output MUST be in the configured language — narration between tool calls, status updates, progress notes, findings, banners, report prose, questions (asked as options or as plain text), and summaries. Technical terms, code, file paths, commands, and identifiers stay in English.
Literal English report/banner templates embedded in a workflow are a structural SOURCE, not literal output to copy verbatim — render their prose in the configured language while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged.
Pass the configured language into every spawned subagent prompt so any user-facing output they produce stays in it.
