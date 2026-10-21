---
instruction_id: run-a-must-finish-pipeline-in-the-foreground
title: Run a must-finish pipeline in the foreground
summary: "A pipeline that has to run to its end runs in one foreground call: it is never handed to a background task or to a sub-agent, because the chain is cut when the caller exits."
capability_tags:
  - execute-plan
pattern_tags:
  - verification-before-completion
conditions_applies_when: A sequence of commands has to complete before the next step may start.
conditions_does_not_apply_when: The steps are independent and may run side by side.
artifact_contract_output_type: foreground-pipeline-run
artifact_contract_required_data:
  - the chain that was run in the foreground
  - the result of the chain
artifact_contract_verified_by: the whole chain ran in one foreground call and the result of the chain is on record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/graphify.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-graphify/SKILL.md
status: active
revision: 1
---

# Run a must-finish pipeline in the foreground
DO NOT pass `run_in_background: true` for the build chain -- the operation is fast and must complete in the foreground.
Do NOT pass `run_in_background: true`. Typical builds complete in 15-60 seconds and the entire chain must run foreground.
Run the build, copy artifacts, write the diff snapshot, and report the summary in a single foreground Bash call so the whole pipeline survives to completion.
DO NOT spawn an agent for any operation -- build, query, status, and diff all run inline.
