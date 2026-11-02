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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-prohibition-findings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body requires a reason and audit trail when dismissing a finding, but the finding subject is unspecified and no listed content domain is grounded."
---

# Dismiss a finding only with a written reason
A dismissal **requires a non-empty reason**; silence is rejected.
The reason string is the audit trail.
A wrong dismissal is the exact silent failure this probe exists to prevent, so dismiss only when the reason is solid.
