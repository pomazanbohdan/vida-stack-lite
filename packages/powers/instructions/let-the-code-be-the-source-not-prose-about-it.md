---
instruction_id: let-the-code-be-the-source-not-prose-about-it
title: "Let the code be the source, not prose about it"
summary: Do not feed the agent textual descriptions of what it can read in the source; they contradict the code and cost context on every call.
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: Material is prepared for an agent that works in a repository it can read.
conditions_does_not_apply_when: The agent cannot read the source and the prose is the only record.
artifact_contract_output_type: context-source-choice
artifact_contract_required_data:
  - what the agent can read
  - what stays archived
  - the contradiction removed
artifact_contract_verified_by: "no prose restates what the source already says and the archived material is out of the ordinary change's reach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/start-in-an-existing-codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 1
---

# Let the code be the source, not prose about it
Most of the knowledge about this application is already encoded in its source.
Modern agents are trained very well to get knowledge from code.
Feeding them textual descriptions of things they can already read there creates contradiction, ambiguity, and context-window bloat.
So what the agent can read cheaply first-hand is read live and never stored.
A stored copy goes stale and costs tokens on every call.
Keep it archived for the few sessions that need it, and out of reach of an ordinary change — an agent doing a small request should not even be able to find it by accident.
