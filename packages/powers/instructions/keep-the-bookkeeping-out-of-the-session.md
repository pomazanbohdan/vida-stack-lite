---
instruction_id: keep-the-bookkeeping-out-of-the-session
title: Keep the bookkeeping out of the session
summary: "The log, the narrative, the lookups and the reasoning happen out of band, so the human sees only what they need."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A long guided session writes files and notes that do not need the user attention.
conditions_does_not_apply_when: "There is no human in the session to protect, or no subagent is available to take the work."
artifact_contract_output_type: delegation-note
artifact_contract_required_data:
  - the files the background worker owns
  - the point at which the background worker is running
artifact_contract_verified_by: the background worker is running before the next step loads
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-01-orientation.md
status: active
revision: 1
---

# Keep the bookkeeping out of the session
Show only what a human needs to see. Do not distract them. Write the log, edit the narrative, look things up, reason — but do not put it in the session.
When subagents are available, spawn a cheap background one for writing log and narrative files. Doing that work in the main session distracts the user.
Do not load the next step until that subagent is running.
