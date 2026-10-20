---
instruction_id: state-diagnosis-problem
title: State the problem before the analysis
summary: "Ask one question at a time until the statement names the session, the expectation, what happened, and the observable that matters."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "You need to find out why an agent's work went wrong."
conditions_does_not_apply_when: The problem is already stated as one specific event with bounds.
artifact_contract_output_type: problem-statement
artifact_contract_required_data:
  - expectation
  - what happened
  - observable
  - bounds
artifact_contract_verified_by: the owner confirms the statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 1
---

# State the problem before the analysis
Ask one question at a time until you can write a statement naming the session or sessions, the turn range if known.
That statement names what your partner expected, what happened, and the observable they care about.
"It took too long" is a complaint, not a problem statement.
Note whether the goal is a bug report for the maintainers.
Nothing in the later steps starts until your partner has answered.
If they are away, write the questions and stop.
A statement you reconstructed for them is not an answer.
An already-scoped request — one specific event, what is running now, or the analysis to run — is itself the statement.
Answer it, then ask.
A whole-session "why" is a complaint.
Do not add a cause to the statement.
Do not narrow the problem to the convenient part.
Record the statement in the case file.
Steps 5-7 of the workflow run only on their stated condition.
