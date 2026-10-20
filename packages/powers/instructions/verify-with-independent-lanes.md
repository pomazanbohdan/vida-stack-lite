---
instruction_id: verify-with-independent-lanes
title: Verify with independent lanes
summary: "Confirm an important result along several paths that do not share one failure point, and name which rung of the executor ladder each lane used."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: A readiness conclusion rests on a single tool or a single test.
conditions_does_not_apply_when: The check is trivial and a second lane costs more than the risk.
artifact_contract_output_type: lane-matrix
artifact_contract_required_data:
  - claim
  - verification lanes
  - shared failure points
  - verdicts
artifact_contract_verified_by: each lane executed with its own captured output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/06-verify-and-ship.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/SKILL.md
status: active
revision: 1
---

# Verify with independent lanes
Ask for the proof as an artifact you can inspect yourself: the failing test and then the passing one, a before-and-after video, the trace, the screenshot.
Match the check to the change.
A CLI change runs the real command.
A UI change walks the changed flow in the running app.
A parser or migration replays a saved input.
A perf change compares before and after profiles.
A storage change reads back the written value.
State the finish condition up front, so the completion claim has checks it can run rather than a mood to satisfy.
When the reply comes back, it should carry the exact commands and outputs.
If a check couldn't run, the reply says inconclusive, and a confident reply without evidence is a red flag.
Verify side effects, such as files written, rows inserted, and messages sent, alongside what's visible.
Choose the lane's executor down a ladder: another model family from another provider first, then another model from the same provider, then a blind agent on the same model.
Each lane gets its own brief and its own evidence sources, and does not see the other lanes' interim conclusions.
Name in the report which rung of the ladder was used and how the weaker rung limits the evidence.
Do not stop work when only one model is available: take the strongest available rung and name the limitation explicitly.
The setup records the available models and providers and the model assigned to verification lanes.
Deliver the matrix of claims and the lanes that verify them.
