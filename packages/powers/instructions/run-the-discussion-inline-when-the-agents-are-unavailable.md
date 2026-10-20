---
instruction_id: run-the-discussion-inline-when-the-agents-are-unavailable
title: Run the discussion inline when the agents are unavailable
summary: "A discussion that was asked for does not silently fail: it runs inline over the same seed, and the document says that it ran inline and what that costs."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
conditions_applies_when: A discussion was asked for and the installed agents cannot be run.
conditions_does_not_apply_when: The discussion ran with the installed agents.
artifact_contract_output_type: inline-discussion
artifact_contract_required_data:
  - the perspectives that were taken
  - the narrowing that the inline run is
artifact_contract_verified_by: the document says the discussion ran inline and names the loss of independent disagreement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/team-discussion.md
status: active
revision: 1
---

# Run the discussion inline when the agents are unavailable
If the agents are unavailable
a discussion the user asked for must not silently fail to happen.
Run it inline over the same seed — take each perspective yourself, hold every perspective to sourced findings — and record in the retrospective document that the discussion ran inline rather than through the installed agents.
Record it as the narrowing it is: one model playing every role loses the independent disagreement that surfaces missed findings.
State that in the document rather than omitting it.
