---
instruction_id: separate-the-no-criteria-result-from-the-could-not-look-result
title: Separate the no-criteria result from the could-not-look result
summary: "Nothing to check and nothing to look at are different results, and they are reported as such."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A verification pass returns without checking anything.
conditions_does_not_apply_when: The criteria were observed and the verdicts are known.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the outcome
  - the reason
artifact_contract_verified_by: the outcome says whether the criteria were absent or the observation was impossible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate the no-criteria result from the could-not-look result
These are different outcomes and must never be collapsed:
A report that says "no issues" when it never opened a browser is worse than no report.
The whole point of this capability is that the run notes stop being ambiguous about whether the work was checked.
