---
instruction_id: stop-on-the-browser-profile-lock-instead-of-retrying
title: Stop on the browser profile lock instead of retrying
summary: A locked browser profile is recorded and the run stops; retrying changes nothing and delays the work.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - resource-bounds
conditions_applies_when: The browser cannot be reached because another instance holds the profile.
conditions_does_not_apply_when: The browser answered and the criteria could be observed.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the outcome
  - the reason
  - the remedy for the operator
artifact_contract_verified_by: the run stopped on the lock and did not retry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.compact.md
status: active
revision: 1
---

# Stop on the browser profile lock instead of retrying
Do **not** retry. Do **not** poll for the lock. Do **not** wait.
Record `outcome: could_not_look`, `reason: profile_locked`.
a retry loop here delays the wave and changes nothing
