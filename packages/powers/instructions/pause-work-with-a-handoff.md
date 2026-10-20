---
instruction_id: pause-work-with-a-handoff
title: Pause work with a handoff
summary: "Leave a checkpoint a cold-start agent can resume from: stop at a safe boundary, make the work durable, and write the resume note off-context."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You stop work before completion and will return later or hand it to someone else.
conditions_does_not_apply_when: The work is finished and the result is already accepted.
artifact_contract_output_type: handoff-note
artifact_contract_required_data:
  - done
  - verified
  - state
  - open questions
  - next step
artifact_contract_verified_by: a fresh session resumes from the note without asking questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/pause-safely.md
status: active
revision: 1
---

# Pause work with a handoff
You own a clean stop.
Leave a checkpoint a cold-start agent can resume from.
On "keep going", "going to bed, keep going", or "don't stop", do not pause.
Stop at a safe boundary: finish the current atomic step or back out of it.
Start nothing new, and cancel any nested subagents.
Take no irreversible action to pause.
No pull request and no push unless you already had one out.
Make the work durable.
Commit uncommitted edits as one clear wip: commit on the current branch so nothing is lost.
If the tree is broken, say so in the commit body in one line.
Write the resume note off-context.
Capture intent, what you were doing, progress and what is verified, current state, next steps, key files, and gotchas.
If a work trail exists, point at it instead of duplicating it.
Report where you are in the loop, what is on disk versus still in your head, the commits you made, whether the tree is clean, and the first action on resume.
This is a pause, not a final report.
