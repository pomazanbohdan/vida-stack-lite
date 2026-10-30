---
instruction_id: time-limit-every-security-exception
title: Time-limit every security exception
summary: "An exception from a control is granted for a bounded period, names the compensating control, and is audited again at the next review."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: An exception from a control is being requested.
conditions_does_not_apply_when: No control is in force for the area.
artifact_contract_output_type: time-limited-exception
artifact_contract_required_data:
  - the control the exception applies to
  - the compensating control
  - the limit and the next audit
artifact_contract_verified_by: "the exception is bounded, compensated and audited again"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Time-limit every security exception
- Exception is time-limited: maximum 90 days. Requester must file a renewal or close the issue.
- All active exceptions are audited at each quarterly review
