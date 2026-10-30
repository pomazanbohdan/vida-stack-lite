---
instruction_id: name-the-signal-that-reveals-a-silent-no-op
title: Name the signal that reveals a silent no-op
summary: "The statement is the answer to one question: what in the output would show that the command was doing nothing."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: The failing direction of a command is written.
conditions_does_not_apply_when: The command was not runnable.
artifact_contract_output_type: failing-direction-statement
artifact_contract_required_data:
  - the observable signal that would reveal a no-op
artifact_contract_verified_by: the statement names an output signal and not a restatement of failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the signal that reveals a silent no-op
Ask one question: **if this command were silently doing nothing, what in its output would tell me?** The answer is the statement.
If there is no answer, you do not have an acceptance command — fix the command rather than inventing a statement for it.
Short is fine — `non-zero exit` is complete. There is no minimum length and no required keyword.
