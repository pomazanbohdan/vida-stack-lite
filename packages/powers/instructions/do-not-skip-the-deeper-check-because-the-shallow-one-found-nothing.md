---
instruction_id: do-not-skip-the-deeper-check-because-the-shallow-one-found-nothing
title: Do not skip the deeper check because the shallow one found nothing
summary: "A preliminary classification is a shallow pass; when a deeper level is in force it still runs, because a clean shallow pass does not replace the deeper verification."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A shallow pass found nothing and a deeper verification level is in force.
conditions_does_not_apply_when: The shallow pass is the level in force.
artifact_contract_output_type: verification-depth
artifact_contract_required_data:
  - the level in force
  - the deeper checks that ran
artifact_contract_verified_by: the deeper verification ran even though the shallow pass was clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/secure-phase.md
status: active
revision: 1
---

# Do not skip the deeper check because the shallow one found nothing
The preliminary threat classification is grep-level (L1 depth) and is insufficient for L2/L3
boundary-placement checks and L3 end-to-end trace checks are performed
Skipping the auditor here would defeat
