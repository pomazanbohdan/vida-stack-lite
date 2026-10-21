---
instruction_id: log-accepted-risks-so-they-do-not-resurface
title: Log the accepted risks so they do not resurface
summary: "An accepted risk is logged with its rationale and who accepted it, and it does not come back in the next audit."
capability_tags:
  - harden-security-controls
pattern_tags:
  - decision-trail
conditions_applies_when: A threat is accepted rather than mitigated.
conditions_does_not_apply_when: The threat is being mitigated.
artifact_contract_output_type: accepted-risk-log
artifact_contract_required_data:
  - the risk
  - the rationale
  - the acceptor
  - the date
artifact_contract_verified_by: "the accepted risk is logged with a rationale, an acceptor and a date"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/SECURITY.md
status: active
revision: 1
---

# Log the accepted risks so they do not resurface
*Accepted risks do not resurface in future audit runs.*
| Risk ID | Threat Ref | Rationale | Accepted By | Date |
