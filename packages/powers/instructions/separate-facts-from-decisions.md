---
instruction_id: separate-facts-from-decisions
title: Separate facts from decisions
summary: Find facts yourself and dispatch a subagent when a question needs the environment; put only decisions to the user and wait for them.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An interview needs information the environment can settle.
conditions_does_not_apply_when: The user is the only source of the fact.
artifact_contract_output_type: fact-or-decision
artifact_contract_required_data:
  - facts found
  - decisions put to the user
artifact_contract_verified_by: "no fact the agent could look up is asked of the user, and no decision is answered by the agent"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/grilling/SKILL.md
status: active
revision: 1
---

# Separate facts from decisions
Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.
