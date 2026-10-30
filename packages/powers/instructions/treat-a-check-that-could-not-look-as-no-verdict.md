---
instruction_id: treat-a-check-that-could-not-look-as-no-verdict
title: Treat a check that could not look as no verdict
summary: "A check that could not read its evidence has produced no verdict; it is routed by the error policy, not read as a result."
capability_tags:
  - verify-work-results
  - degrade-gracefully-under-failure
pattern_tags:
  - evidence-analysis
conditions_applies_when: A check exits with an error instead of returning a verdict.
conditions_does_not_apply_when: "The check returned a verdict, including a blocking one."
artifact_contract_output_type: error-routing
artifact_contract_required_data:
  - the error
  - the error policy that applies
  - the disposition
artifact_contract_verified_by: no verdict is read out of the failed check and the policy decides what happens
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verify-command-path-resolvability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a check that could not look as no verdict
Honor `onError` if the check itself errors: `skip` means treat as non-blocking and continue; `halt` means surface the error and stop
That JSON is not a verdict — do not act on its `block`; route it by `onError` as a step-1 command failure
A non-empty `readError` means the probe could not look. Report that as a WARNING in its own words; it is not a clean bill of health
