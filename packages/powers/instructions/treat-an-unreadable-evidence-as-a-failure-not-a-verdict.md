---
instruction_id: treat-an-unreadable-evidence-as-a-failure-not-a-verdict
title: "Treat an unreadable evidence as a failure, not a verdict"
summary: "A check that could not read its evidence prints a JSON error payload, not a verdict; the block field of that payload is never acted on, and the failure is routed by the error policy."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check exits non-zero because it could not read the evidence it was asked to judge.
conditions_does_not_apply_when: "The check delivered a verdict, blocking or not."
artifact_contract_output_type: unreadable-evidence-report
artifact_contract_required_data:
  - what could not be read
  - the error policy that was applied
  - the route the failure took
artifact_contract_verified_by: the block field of the error payload was not acted on and the failure was routed as a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat an unreadable evidence as a failure, not a verdict
That JSON is not a verdict - do not act on its `block`; route it by `onError` as a step-1 command failure. Exit `0` always means a delivered verdict, a blocking one included (`block: true`): a gate verb never exits non-zero to say "blocked".
A gate verb exits
when it **could not look** at its evidence, still printing the gate's usual JSON (its own fields name what could not be read, such as `status: "unresolvable"`, `readError`, or `unreadable`).
Honor `onError` if the check itself errors: `skip` means treat as non-blocking and continue; `halt` means surface the error and stop.
