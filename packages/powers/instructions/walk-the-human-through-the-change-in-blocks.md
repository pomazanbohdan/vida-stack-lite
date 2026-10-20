---
instruction_id: walk-the-human-through-the-change-in-blocks
title: Walk the human through the change in blocks
summary: Write a review narrative in blocks by concern and walk the human through it one block at a time; a block is done only when they say so.
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: "A human is reviewing a commit, pull request, file or directory and wants to be taken through it."
conditions_does_not_apply_when: The review is an agentic review that produces findings and a verdict.
artifact_contract_output_type: guided-review-narrative
artifact_contract_required_data:
  - the blocks
  - the orientation
  - the moves offered
artifact_contract_verified_by: the narrative is organised by concern and each block waits for the human to call it done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/walk-through-a-change.md
status: active
revision: 1
---

# Walk the human through the change in blocks
Orientation. What the target is and what it is for, from a plan or spec, PR description, and commit messages when they exist.
A file organized in blocks: intent, broad strokes, slices by concern (not by file), then periphery.
It writes a review narrative, then walks you through it one block at a time.
You can stop to inspect, edit, or test.
A block is done only when you say it is.
It does not assign severity scores or produce a pass/fail verdict.
