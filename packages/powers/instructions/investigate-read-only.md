---
instruction_id: investigate-read-only
title: Investigate read-only before changing code
summary: "Ask for findings, not a fix: a cited explanation or a recommendation that separates evidence from guesses."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The cause of a behavior is unclear and no code change has been agreed.
conditions_does_not_apply_when: "A fix is already agreed and scoped, so the answer would only delay it."
artifact_contract_output_type: investigation-answer
artifact_contract_required_data:
  - answer
  - sources searched
  - evidence
  - open questions
artifact_contract_verified_by: read-only commands and file references cited in the answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/03-understand.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/references/explorer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/investigation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Investigate read-only before changing code
Editing code you don't understand is how subtle regressions ship, and that's as true for the agent as for you.
When the cause is unclear, ask for findings, not a fix.
Investigation requests are read-only.
They produce a cited explanation or a recommendation, not a code change.
Asking what data you used makes the agent separate its evidence from its guesses.
Route the question through the understanding pass; for motivation questions, also trace the history.
Produce the shaped output: Overview, Key Concepts, How It Works, Where Things Live, Gotchas, or a recommendation with a tradeoffs table if the request is a decision between alternatives.
Cite everything.
Separate direct evidence from inference, and say it appears to when the record is thin.
A null result gets reported too, because nobody wrote down why is itself an answer.
For a big subsystem, fan out two to four read-only explorers first, each on its own assigned angle and told to go deep rather than cover everything.
For a narrow question, just read and explain.
Name the components found: the key types, services, classes, and abstractions, with name, file path, and a one-sentence description of what each does.
Give the execution flow step by step, including the data that flows between steps.
List the files read, so the explanation can reference them.
State the boundaries: where this subsystem connects to other parts of the codebase, and its inputs and outputs.
Name the non-obvious things: anything surprising, historically motivated, or easy to get wrong.
Name the open questions you couldn't fully trace or understand, and be honest about gaps.
When the findings point at a fix, start the fix as a new task.
No PR and no design pass unless the investigation precedes a code change.
