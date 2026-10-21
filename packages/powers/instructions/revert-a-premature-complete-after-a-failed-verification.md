---
instruction_id: revert-a-premature-complete-after-a-failed-verification
title: Revert a premature complete after a failed verification
summary: "When the verification finds gaps, the items that were already marked complete in this scope are put back, and only in this scope."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A verification found gaps in work whose items are already marked complete.
conditions_does_not_apply_when: The verification passed.
artifact_contract_output_type: reverted-status
artifact_contract_required_data:
  - the items that were reverted
  - the scope that was touched
  - the gaps that were found
artifact_contract_verified_by: the premature completion was removed in this scope only
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-requirement-revert.md
status: active
revision: 1
---

# Revert a premature complete after a failed verification
A shared requirement ID can already read `Complete` at this point (its first-declaring plan finished before this verification ran) — a `gaps_found` verdict must not leave that premature `Complete` sitting in REQUIREMENTS.md.
so another phase's `Complete` row is never touched
