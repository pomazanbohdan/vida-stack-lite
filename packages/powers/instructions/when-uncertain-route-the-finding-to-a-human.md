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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# When uncertain, route the finding to a human
Classification heuristics (err on manual-only when uncertain):
When uncertain, always classify as manual-only.
