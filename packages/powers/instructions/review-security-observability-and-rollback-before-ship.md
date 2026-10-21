---
instruction_id: review-security-observability-and-rollback-before-ship
title: "Review security, observability and rollback before ship"
summary: "Before merge or deploy, the security implications, the telemetry and the rollback path are checked and the human has approved."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: A change is about to be merged or deployed.
conditions_does_not_apply_when: The work stays local and ships with nothing.
artifact_contract_output_type: ship-readiness-review
artifact_contract_required_data:
  - the security review
  - the telemetry in place
  - the rollback path
  - the approval
artifact_contract_verified_by: each of the four ship-readiness items is confirmed by a person before merge or deploy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
---

# Review security, observability and rollback before ship
Security implications reviewed for any untrusted input, auth, or data handling
Observability in place for new critical paths (logs, metrics, traces)
Rollback path exists for anything risky
The human has reviewed and approved before merge or deploy
"Done" declared before human review on changes that need it.
- All CI checks pass on the release branch
- The version bump is consistent with the semver policy
- The changelog entry is present
