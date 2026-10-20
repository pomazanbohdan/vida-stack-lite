---
instruction_id: map-trust-boundaries-before-finding
title: Map the trust boundaries before the findings
summary: "Find the points where untrusted data enters, reason about each with STRIDE, and only then enumerate findings."
capability_tags:
  - review-code
pattern_tags:
  - threat-modeling
conditions_applies_when: A security review is about to enumerate its findings.
conditions_does_not_apply_when: The trust boundaries are already mapped and the findings are enumerated.
artifact_contract_output_type: trust-boundary-map
artifact_contract_required_data:
  - trust boundary
  - STRIDE threats considered
  - findings
artifact_contract_verified_by: every finding is attached to a mapped trust boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 1
---

# Map the trust boundaries before the findings
Start from trust boundaries — where untrusted data enters — and reason about each with STRIDE before enumerating findings
