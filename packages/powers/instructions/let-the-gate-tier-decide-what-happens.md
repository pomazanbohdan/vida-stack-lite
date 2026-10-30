---
instruction_id: let-the-gate-tier-decide-what-happens
title: Let the gate tier decide what happens
summary: A blocking gate that blocks stops the run and an error policy never bypasses that decision; an advisory gate reports and continues.
capability_tags:
  - harden-validation
pattern_tags:
  - control-tiering
conditions_applies_when: A gate returned a verdict and the run has to decide what the verdict means.
conditions_does_not_apply_when: The gate is not tiered.
artifact_contract_output_type: gate-decision
artifact_contract_required_data:
  - the tier of the gate
  - the verdict
  - what the run did
artifact_contract_verified_by: a blocking verdict stopped the run and an advisory verdict did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/wave-post-gate-hooks.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let the gate tier decide what happens
Blocking gate (`hook.blocking == true`) AND `GATE_RESULT.block == true`: HALT — stop wave completion, do NOT proceed
This halt is **not** bypassed by `onError` — `onError` only covers command errors
not the gate's block decision.
Non-blocking gate (`hook.blocking == false`): never halts.
If block `false` and no `message`: continue silently.
