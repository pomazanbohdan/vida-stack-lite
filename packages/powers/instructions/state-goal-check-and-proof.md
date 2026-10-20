---
instruction_id: state-goal-check-and-proof
title: "State the goal, the check, and the proof"
summary: "Report the end state, the check at its boundary, and a pointer to the evidence, rather than a list of actions taken."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: You have a verification result and report the end state reached.
conditions_does_not_apply_when: "Verification has not run yet, or you only need to decide whether completion may be claimed."
artifact_contract_output_type: goal-proof
artifact_contract_required_data:
  - goal
  - check boundary
  - actual output
  - residual risk
artifact_contract_verified_by: the reported check output reproduced by the reader
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/show-me-your-work/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-outcome-oriented-execution/SKILL.md
status: active
revision: 2
---

# State the goal, the check, and the proof
Keep one canonical log. A single file, one row per decision. Cells stay single-line. Evidence is a pointer, not prose.
The columns are the timestamp, the phase or workstream, the decision in one line, the reason in plain words, the evidence pointer, and the result or predicate state.
Evidence is a link or path that proves the row: a commit identifier, a change number, a file and line, or an artifact, trace, or screenshot path. Never a paragraph.
The result says the outcome or predicate state: checks green, reverted, pixel difference zero, inconclusive, or open.
Write each entry the way you would tell a teammate what you did. Plain words, concrete actions, no jargon.
Log decision points and checkpoints, not every action: a fork chosen, a unit completed with its verification result, a pivot or revert with its trigger, a blocker surfaced, a gate fixed.
Skip the trivial and self-evident.
The log is append-only. A wrong call gets a new row that supersedes it. Never edit or delete history.
By default the log is a working artifact, not committed. Commit it only when the work is ambitious enough that a reviewer needs the trail to trust the result.
At the end of the run, check that the log told the truth against the transcript. Each row maps to a real decision or action, and each row's evidence resolves and shows what the row claims.
A fork, pivot, or abandoned approach that shaped the work but is not logged is a gap. Add it.
Correct the log, not the story. The audit never edits or removes a row, even an invented one.
Before handing back, have a subagent on a different model family read the trail and the transcript, and flag weak evidence, skipped verification, risky choices, and gaps the user would miss.
End the reply with an attention section that leads with the reviewer's model and lists each flag against specific rows. No flags is a valid value.
Optimize for the intended, verifiable end state rather than preserving smooth intermediate states.
Intermediate breakage is acceptable when it is planned, scoped, and reversible.
Declare where temporary breakage is acceptable, keep high-signal checks for actively touched areas, and require full static and runtime verification at plan completion.
