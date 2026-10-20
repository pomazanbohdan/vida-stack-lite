---
instruction_id: analyze-stumbles
title: Record every point where the session stopped going forward
summary: "Find errors, failed commands, retries, reverts, backtracking, and corrections, and say whether and where the session recovered."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "The complaint concerns failures, stalls, or frequent fixes."
conditions_does_not_apply_when: The artifact contains no errors or interruptions.
artifact_contract_output_type: stumble-report
artifact_contract_required_data:
  - event
  - location
  - next action
  - recovery state
artifact_contract_verified_by: each stumble has a line and a recovery status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/stumbles.md
status: active
revision: 1
---

# Record every point where the session stopped going forward
Find every point where the session stopped going forward.
Sources use the case file's evidenced record meanings and extraction commands to locate line numbers.
Find tool results marked as errors, non-zero exits, or explicit failure records.
Find shell commands that failed: non-zero exit in the result, "command not found", "No such file".
Find retries: the same tool call re-issued within the same turn after an error.
Find reverted edits: an edit followed by an edit that restores the earlier content.
A reset of a file the session touched also counts.
Find backtracking in assistant text ("actually", "let me instead", "that was wrong", "I misread").
Find human corrections: a human prompt that contradicts or corrects the assistant's immediately preceding action.
Find permission denials, hook failures, API errors, rate limits, aborted turns, and context overflow or compaction triggered mid-task.
For each stumble report the line, the turn, what failed, and what happened next.
Recovered in the same turn, recovered later at line N, or never recovered.
Group identical repeated failures into one finding with a count.
Do not attribute a tool failure to the implementer.
