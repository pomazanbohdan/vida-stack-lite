---
instruction_id: keep-an-unattended-run-on-the-quality-gates
title: Keep an unattended run on the quality gates
summary: An unattended run still checks the plan before it executes it and still routes on the verification result; only a pass advances on its own.
capability_tags:
  - coordinate-program
pattern_tags:
  - unattended-execution
conditions_applies_when: A run continues through several phases without a human present.
conditions_does_not_apply_when: A single phase is run step by step with the human in the loop.
artifact_contract_output_type: unattended-run-policy
artifact_contract_required_data:
  - the gates the run still applies
  - the states that pause the run
artifact_contract_verified_by: the run states the gates it still applies and the states that pause it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/run-phases-autonomously.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep an unattended run on the quality gates
Runs the plan-checker before execution
Reads `VERIFICATION.md` after execution and routes on the result
Pauses and asks you what to do when verification status is `human_needed` or `gaps_found`
Stops and presents options (fix and retry, skip phase, or stop) if any step fails
The only difference from manual execution is that `passed` verification advances automatically — you are not prompted between phases unless a decision is required.
