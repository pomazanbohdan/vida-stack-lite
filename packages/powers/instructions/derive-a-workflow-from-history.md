---
instruction_id: derive-a-workflow-from-history
title: "Derive a workflow from the user's history"
summary: "Mine the user's recent transcripts for recurring preferences, confirm them directly, and draft one mode skill from the signals that survive."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Agents must follow how a specific user works, and no mode skill for them exists yet."
conditions_does_not_apply_when: "The request is for a task-specific skill or one narrow workflow, which needs no mining."
artifact_contract_output_type: workflow-spec
artifact_contract_required_data:
  - signals with evidence pointers
  - cluster sections
  - draft skill
  - description trigger
artifact_contract_verified_by: the workflow executed end to end on one real task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/automate-me/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/references/recipes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Derive a workflow from the user's history
Look recursively for an existing mode skill matching the user's handle, since mode skills can live in a personal category directory, not only at the top level.
If one exists, confirm intent: update the existing skill, which is the default for repeat runs, or start fresh, which is rare and asks why before doing it.
Locate the active workspace's transcripts before fanning out, and use only that path.
Don't glob across other projects: that crosses workspace boundaries and reads private chats from unrelated projects.
Survey recent agent conversations within that scope for recurring patterns.
Run multiple parallel subagents across slices of history so each has enough material.
Each slice returns a short structured list of patterns it saw with evidence pointers.
Look for response preferences, delegation habits, verification posture, code and prose discipline, process conventions, and meta preferences.
Cross-check across slices before elevating a signal: patterns seen in two or more slices are high-confidence, and lone signals are weak and usually get dropped.
Mining misses intent that hasn't come up yet, so ask the user directly with structured multi-choice questions rather than asking them to type from scratch.
Start broad, follow up on the selected areas, and finish with one free-form question that catches anything the options missed.
Don't dump twenty questions.
Cluster the combined signals into sections, and use only what applies.
Don't copy another mode's content, because the user's rules are not the same as its rules.
Draft the skill with a description that triggers on their name and on working in their style, not on generic keywords like write code or review a PR.
Show the draft to the user and take feedback; expect multiple iterations.
Cut ruthlessly, because a mode skill is not a manual.
Don't overfit to one conversation: a preference stated once and contradicted another time is noise.
Don't be clever: restating other skills' contents, inventing metaphors, or writing poetic prose for an agent reader is cost without benefit; keep it operational.
Reference, don't inline: other skills the user relies on appear as path references, not pasted excerpts.
Keep sections minimal: only add a section if the user has a specific, non-default rule there.
Name conventions generic: use the user or the human in imperatives, not the author's first name.
Don't force symmetry: if a user has no process rules worth writing down, skip the process section entirely.
Work in a worktree off main, commit, and open a PR; don't push to main directly.
