---
instruction_id: never-conclude-already-adopted-from-resemblance
title: Never conclude already-adopted from resemblance
summary: "The verdict that an upstream version already carries a customization comes from a structural check that every significant added line is present — never from a signature line, a heading or a general resemblance."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A local change is compared with the version that replaced it.
conditions_does_not_apply_when: The two versions are compared only for the report.
artifact_contract_output_type: adoption-verdict
artifact_contract_required_data:
  - the added lines
  - the check that confirmed them
  - the verdict
artifact_contract_verified_by: "the verdict rests on every significant added line being present, not on a resemblance"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 1
---

# Never conclude already-adopted from resemblance
Never conclude `Incorporated` from a signature line, a heading, or general resemblance
the classifier excludes structural/trivial lines and requires every significant user-added line to be present
because a false `Incorporated` silently retires a live customization
That is the only ground on which the `Incorporated` status below is valid
