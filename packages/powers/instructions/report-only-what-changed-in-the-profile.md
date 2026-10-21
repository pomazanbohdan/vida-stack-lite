---
instruction_id: report-only-what-changed-in-the-profile
title: Report only what changed in the profile
summary: A refreshed profile shows the dimensions that changed and says so when nothing did.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - concise-communication
conditions_applies_when: A profile was rebuilt and is compared with the previous one.
conditions_does_not_apply_when: There is no previous profile to compare against.
artifact_contract_output_type: profile-diff
artifact_contract_required_data:
  - the dimensions that changed
  - the before and after of each
artifact_contract_verified_by: only the changed dimensions are shown and an unchanged profile says so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 1
---

# Report only what changed in the profile
Compare each dimension's rating and confidence between old and new. Display diff table showing only changed dimensions:
If nothing changed: Display "No changes detected -- your profile is already up to date."
