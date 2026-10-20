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
  - suggested skills
artifact_contract_verified_by: a fresh session resumes from the note without asking questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/pause-safely.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/handoff/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/in-progress/claude-handoff/SKILL.md
status: active
revision: 2
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
Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows) - not the current workspace. Include a "suggested skills" section in the document, naming which skills the next agent should call. Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead. Redact any sensitive information, such as API keys, passwords, or personally identifiable information.
