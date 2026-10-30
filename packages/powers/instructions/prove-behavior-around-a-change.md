---
instruction_id: prove-behavior-around-a-change
title: Prove behavior around a change
summary: "Observe the reported behavior before and after the existing change, twice on each side, and refuse to call it fixed from compilation or tests alone."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "You fix existing behavior, or check whether someone else's fix actually works."
conditions_does_not_apply_when: The behavior does not exist yet and a new scenario has to be written from scratch.
artifact_contract_output_type: behavior-proof
artifact_contract_required_data:
  - expected behavior
  - observation point
  - result before and after
  - automated check
artifact_contract_verified_by: the same scenario executed before and after the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/correct/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Prove behavior around a change
Use this when an existing change or fix claims to resolve a reported behavior. The existing artifact owns the fix. Verify it. Do not edit it, author a competing patch, or open another change.
Require one concrete artifact: an open change with code that addresses the symptom, a merged change, or a merged commit with matching code and intent. A thread claim, tracker status, branch name, or cause hypothesis without a change or commit is not enough.
When several artifacts exist, choose the one linked from the report. Otherwise choose the closest match to the affected code and state why.
Protect the working tree. Use an isolated worktree or another clean checkout. Do not overwrite user changes.
Record the baseline revision, the patched revision, the artifact link, and the build and environment inputs shared by both runs.
Measure the baseline first. For an open change, use its base branch. For a merged fix, use the revision immediately before it when that revision builds and represents the old behavior.
Bring up the baseline app, confirm the correct app and environment, run the reported path through real actions, observe the discriminating symptom, reset, and repeat.
If the symptom does not appear twice on the baseline, there is no baseline. Do not claim that the fix works.
Build and run the patched artifact with the same environment and data. Run the same path, repeat it twice, confirm that the broken state is gone, and confirm that the expected state appears.
Do not stop at compilation or tests. The after result must come from a running patched app.
Confirmed: the baseline reproduces twice and the patched build resolves it twice. Report the result and open no change.
Insufficient fix: the symptom appears on both the baseline and the patched build. Say that the artifact did not resolve it and open no competing change.
Inconclusive: the baseline does not reproduce, the patched app cannot run, or the evidence does not show the discriminating state. Do not claim success. State which half could not be measured.
Fix or delete any test that still passes when the behavior it checks breaks, or that fails when only the internals change.
Clean up both builds and return the repository to its prior state without discarding user work.
