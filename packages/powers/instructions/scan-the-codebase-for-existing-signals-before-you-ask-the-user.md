---
instruction_id: scan-the-codebase-for-existing-signals-before-you-ask-the-user
title: Scan the codebase for existing signals before you ask the user
summary: What the repository already answers is not asked; the interview is cut down to what only the user knows.
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: A decision needs information that the repository may already hold.
conditions_does_not_apply_when: The question is about preference and has no answer in the repository.
artifact_contract_output_type: interview
artifact_contract_required_data:
  - the detected signals
  - the questions asked
artifact_contract_verified_by: the codebase was scanned and the question count stayed within the bound
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-framework-selector.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-framework-selector.compact.md
status: active
revision: 1
---

# Scan the codebase for existing signals before you ask the user
Scan for existing technology signals before the interview:
This prevents recommending a framework the team has already rejected.
Use a single AskUserQuestion call with ≤ 6 questions. Skip what the codebase scan or upstream CONTEXT.md already answers.
