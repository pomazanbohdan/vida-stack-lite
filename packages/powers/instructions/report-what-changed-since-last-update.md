---
instruction_id: report-what-changed-since-last-update
title: Report what changed since the last update
summary: "Catch the reader up from the tables, not from narrative: what changed, what landed, which verdicts stand, and which gates await them."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A run or a program reports at a checkpoint or at close.
conditions_does_not_apply_when: The work is one answer with no intervening state to catch up on.
artifact_contract_output_type: progress-delta
artifact_contract_required_data:
  - states and counts
  - what changed
  - open gates
  - links to every PR
artifact_contract_verified_by: each completed item linked to its check result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/07-overnight.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/orchestrate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Report what changed since the last update
A drain turn ends with three lines from the status command: counts against the states, what changed, gates open.
Detail lives in the status page, not in the report.
At checkpoints and close, report the predicate and the count against it.
Report the tracks and what each landed.
Report the frontier: the PR list plus head SHAs.
Report the verdicts summary, and what was abandoned and why.
Report the gates awaiting the human, which are the only asks.
Name the store path and the trail path.
Numbers come from the tables, not narrative.
Include PR links.
Each trail row records the time, phase, decision, reason, an evidence pointer, and the result.
The trail stays local by default.
Commit it when the work is ambitious enough that a reviewer needs the trail to trust the result.
The reply ends with an attention section listing what deserves scrutiny.
Put that section first, then the log rows it points at, because the reader is auditing decisions, not re-reading the whole night.
