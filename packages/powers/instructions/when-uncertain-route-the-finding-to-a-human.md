---
instruction_id: when-uncertain-route-the-finding-to-a-human
title: "When uncertain, route the finding to a human"
summary: "A finding whose fix needs a decision is routed to a person, and an uncertain classification is resolved as manual-only rather than attempted."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A finding is classified by whether it can be fixed automatically.
conditions_does_not_apply_when: The classification is certain.
artifact_contract_output_type: uncertain-classification
artifact_contract_required_data:
  - the class chosen
  - the rule that resolved the uncertainty
artifact_contract_verified_by: an uncertain finding was classified as manual-only
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-fix.md
status: active
revision: 1
---

# When uncertain, route the finding to a human
Classification heuristics (err on manual-only when uncertain):
When uncertain, always classify as manual-only.
