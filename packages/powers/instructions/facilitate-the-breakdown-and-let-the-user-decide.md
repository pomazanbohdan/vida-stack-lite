---
instruction_id: facilitate-the-breakdown-and-let-the-user-decide
title: Facilitate the breakdown and let the user decide the scope
summary: "Turn the user's intent into work items another agent can build from: propose the boundaries, explain the tradeoffs, check the coverage, and let the user own the scope and the split."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request has to become a set of work items that someone else will build.
conditions_does_not_apply_when: The scope and the split are already decided and only the items have to be written down.
artifact_contract_output_type: work-item-breakdown
artifact_contract_required_data:
  - the proposed boundaries
  - the coverage check
  - the open questions
artifact_contract_verified_by: the user confirms the scope and the split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
status: active
revision: 1
---

# Facilitate the breakdown and let the user decide the scope
You are the facilitator: help the user turn their intent into tickets a coding agent can build from.
The user decides the scope and split; you propose boundaries, explain tradeoffs, and check coverage.
Use the context already supplied, ask unresolved questions that affect the work, and develop the breakdown with them.
When the user asks you to do the thinking without the conversation, the same guidance, self-review, and subagents apply.
For a request that creates work, size it from what the user said and what is in context, and say which path you are taking and why
