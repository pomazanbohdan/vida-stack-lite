---
instruction_id: an-accepted-override-counts-as-a-pass-not-as-a-failure
title: "An accepted override counts as a pass, not as a failure"
summary: A recorded override carries the item as passed and names who accepted it and when; a failure that looks deliberate earns an override suggestion.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A criterion failed but a deviation has been accepted.
conditions_does_not_apply_when: No deviation has been accepted.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the override reason
  - who accepted it
  - when
artifact_contract_verified_by: the overridden item is counted as passing and the acceptance is recorded with its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 1
---

# An accepted override counts as a pass, not as a failure
**If override found:**
- Mark as `PASSED (override)` instead of FAIL/PRESENT_BEHAVIOR_UNVERIFIED
- Evidence: `Override: {reason} — accepted by {accepted_by} on {accepted_at}`
- Count toward passing score (`verified_truths`), not failing score
