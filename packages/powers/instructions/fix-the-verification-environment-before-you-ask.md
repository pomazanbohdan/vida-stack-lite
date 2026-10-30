---
instruction_id: fix-the-verification-environment-before-you-ask
title: Fix the verification environment before you ask the human
summary: "A checkpoint is never presented with a broken environment: the failure is repaired, or the checkpoint waits."
capability_tags:
  - automate-what-can-be-automated
pattern_tags:
  - verification-before-completion
conditions_applies_when: The environment a human would use to verify the work is not working yet.
conditions_does_not_apply_when: The environment works and only the judgement of the result is left to the human.
artifact_contract_output_type: environment-repair-record
artifact_contract_required_data:
  - the failure that was repaired
  - the repair
  - the check that shows the environment now works
artifact_contract_verified_by: the environment answers before the human is asked to look at it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Fix the verification environment before you ask the human
Never present a checkpoint with broken verification environment.
If the local server isn't responding, don't ask user to "visit localhost:3000".
Check error, fix issue, retry (don't proceed to checkpoint)
Kill stale process or use alternate port
Run `npm install`, retry
Fix the error first (bug, not checkpoint issue)
Retry with backoff, then checkpoint if persistent
Investigate error, fix root cause, restart server
