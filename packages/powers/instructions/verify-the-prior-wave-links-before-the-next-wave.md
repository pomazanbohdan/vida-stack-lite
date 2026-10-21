---
instruction_id: verify-the-prior-wave-links-before-the-next-wave
title: "Verify the prior wave's links before the next wave"
summary: "The links the previous wave produced are checked before the next wave starts, and a broken link is shown with the choice to fix it or to continue knowingly."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: A wave is about to start and the previous wave produced artifacts it depends on.
conditions_does_not_apply_when: There is no earlier wave.
artifact_contract_output_type: wave-link-check
artifact_contract_required_data:
  - the links that were checked
  - the link that failed
  - the choice offered
artifact_contract_verified_by: the links were checked and a failed link was shown before the next wave started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-between-wave-reset.md
status: active
revision: 1
---

# Verify the prior wave's links before the next wave
If any PRIOR-wave artifact link fails, present:
Options: investigate+fix before continue, or continue with cascade risk
Skip key-links that reference files in the CURRENT (upcoming) wave.
could not look — surface it, never treat the plan as wired
