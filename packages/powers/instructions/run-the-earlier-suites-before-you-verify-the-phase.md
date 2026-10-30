---
instruction_id: run-the-earlier-suites-before-you-verify-the-phase
title: Run the earlier suites before you verify the phase
summary: "The test suites of the completed earlier phases run after the execution, and a failure is reported as a cross-phase regression naming the phase that broke."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A phase of work has just been executed.
conditions_does_not_apply_when: No earlier phase exists.
artifact_contract_output_type: cross-phase-regression-report
artifact_contract_required_data:
  - the earlier suites that were run
  - the failures that appeared
  - the earlier phase whose tests broke
artifact_contract_verified_by: the regression was surfaced before the verification and names the earlier phase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/cross-phase-regression-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the earlier suites before you verify the phase
System MUST run test suites from all completed prior phases after phase execution
System MUST report any test failures as cross-phase regressions
Regressions MUST be surfaced before post-execution verification
System MUST identify which prior phase's tests were broken
