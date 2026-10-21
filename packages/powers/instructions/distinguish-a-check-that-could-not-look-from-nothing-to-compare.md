---
instruction_id: distinguish-a-check-that-could-not-look-from-nothing-to-compare
title: Distinguish a check that could not look from nothing to compare
summary: "A check that failed to run is reported as a warning and the run continues; it is never read as \"nothing to compare\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A gate or a pre-check could not read its evidence.
conditions_does_not_apply_when: The check ran and returned a verdict.
artifact_contract_output_type: check-unavailability
artifact_contract_required_data:
  - the warning that was raised
  - the decision the run took on it
artifact_contract_verified_by: the unreadable check was reported as a warning and never counted as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Distinguish a check that could not look from nothing to compare
A gate that failed to run
is a check that could not look, not "nothing to compare":
the warning above is its signal, and planning continues (the check is advisory).
