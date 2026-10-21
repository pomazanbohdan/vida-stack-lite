---
instruction_id: dismiss-a-finding-only-with-a-written-reason
title: Dismiss a finding only with a written reason
summary: A dismissal without a non-empty reason is rejected; the reason is the audit trail.
capability_tags:
  - triage-reports
pattern_tags:
  - decision-trail
conditions_applies_when: A finding does not apply and is about to be dismissed.
conditions_does_not_apply_when: The finding applies and is about to be resolved into a criterion.
artifact_contract_output_type: finding-dismissal
artifact_contract_required_data:
  - the reason the finding does not apply
artifact_contract_verified_by: the dismissal carries a non-empty reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 1
---

# Dismiss a finding only with a written reason
A dismissal **requires a non-empty reason**; silence is rejected.
The reason string is the audit trail.
A wrong dismissal is the exact silent failure this probe exists to prevent, so dismiss only when the reason is solid.
