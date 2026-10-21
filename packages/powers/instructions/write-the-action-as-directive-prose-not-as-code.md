---
instruction_id: write-the-action-as-directive-prose-not-as-code
title: "Write the action as directive prose, not as code"
summary: The action says what to build and what to avoid; the implementation itself belongs in the referenced sources.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The action of a task is written.
conditions_does_not_apply_when: The output is a reference document that may carry code.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the action
artifact_contract_verified_by: the action carries no fenced code block
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Write the action as directive prose, not as code
NEVER place fenced code blocks (```) inside `<action>`. Action is directive prose, not implementation code.
Code excerpts belong in `<read_first>` source files or referenced context. Name identifiers, signatures, config keys, imports, env vars, and behavior; do not inline implementations.
Bad: "the auth files", "relevant components"
