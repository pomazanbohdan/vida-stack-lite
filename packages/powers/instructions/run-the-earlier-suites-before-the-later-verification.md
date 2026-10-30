---
instruction_id: run-the-earlier-suites-before-the-later-verification
title: Run the earlier suites before the later verification
summary: "The suites of the already-finished units run before the verification of the new unit, so a regression across units is caught before the new work is declared good."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Earlier units of the same effort already exist and their test files are known.
conditions_does_not_apply_when: This is the first unit and no earlier suite exists.
artifact_contract_output_type: regression-gate-report
artifact_contract_required_data:
  - the earlier test files collected
  - the outcome of running them
  - the decision taken on a failure
artifact_contract_verified_by: the earlier suites ran before the verification of the new unit and a failure stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/regression-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Run the earlier suites before the later verification
Run prior phases' test suites to catch cross-phase regressions BEFORE verification.
HALT — do not proceed to verification.
