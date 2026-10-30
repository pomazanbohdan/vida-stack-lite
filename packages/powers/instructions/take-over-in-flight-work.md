---
instruction_id: take-over-in-flight-work
title: Take over in-flight work
summary: "Read the prior trail as authoritative, reconstruct the actual state, and resume from the smallest next action without redoing completed work."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You start from unfinished work left by another executor or a previous run.
conditions_does_not_apply_when: The work starts from a clean state.
artifact_contract_output_type: takeover-record
artifact_contract_required_data:
  - actual state
  - decisions made
  - stopping point
  - next step
artifact_contract_verified_by: existing checks run before any edit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/ketchup/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/session-pickup.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Take over in-flight work
You own the resume point: read the prior trail, do not redo it.
Locate the prior trail in the active workspace's transcript directory, a cloud-agent URL, or a pushed branch.
Read the metadata overview and last messages first, then scan back for the decision points.
Parse a long transcript outside the main thread and keep the reduced timeline.
Reconstruct operational state: the branch and worktree, what already landed, the open todos, and the decisions made.
The prior trail is authoritative input; resist the bias to re-derive it.
Diff done against pending: compare what shipped against what was planned and name the resume point.
Do not re-run the prior reproduction or redo completed work.
A "let me verify from scratch" pass means you are treating the trail as untrustworthy when it is authoritative.
Route the remaining work to the matching workflow and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run.
Verify the inherited claims against the original goal on the real artifact.
A passing prior self-report is not the proof.
Run the existing checks before any edit.
Report where the prior agent stopped, what you inherited versus redid, the resume point, and the outcome.

If the initialisation was interrupted, keep the artefacts that already landed, skip the steps that would recreate them, and continue from the first missing artefact in order. Do not error and do not send the user back to the start.
