---
instruction_id: run-the-disconfirmation-pass-even-when-the-verification-passes
title: Run the disconfirmation pass even when the verification passes
summary: "After the first verification pass, one partly met requirement, one misleading test and one uncovered error path are searched for and reported."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The first verification pass has finished.
conditions_does_not_apply_when: The run is a re-verification of items that already passed.
artifact_contract_output_type: disconfirmation-pass
artifact_contract_required_data:
  - the partly met requirement
  - the misleading test
  - the uncovered error path
artifact_contract_verified_by: the three findings are reported even though the verification passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Run the disconfirmation pass even when the verification passes
After your initial verification pass, do a DISCONFIRMATION pass: (1) find one requirement that is only partially met, (2) find one test that passes but does not actually test the stated behavior, (3) find one error path that has no test coverage. Report these even if overall verification passes
