---
instruction_id: verify-behaviour-at-runtime-not-only-at-compile
title: "Verify the behaviour at runtime, not only at compile time"
summary: "A change counts as done only when it has actually run and behaved as intended, not when it merely compiles or type-checks."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is about to be declared finished.
conditions_does_not_apply_when: The claim made is not about the change working.
artifact_contract_output_type: runtime-verification-record
artifact_contract_required_data:
  - the behaviour that was exercised
  - the run that exercised it
  - the observed result
artifact_contract_verified_by: the change was executed at runtime and the observed result is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
status: active
revision: 1
---

# Verify the behaviour at runtime, not only at compile time
Code runs and behaves as intended, verified at runtime, not just compiled or typechecked
Existing tests still pass; no regressions introduced
"It's done, I just haven't run it yet": unverified work is not done.
