---
instruction_id: tag-every-claim-with-the-strength-of-its-source
title: Tag every claim with the strength of its source
summary: "Every claim carries a tag for how it was established, and what is not established is never presented as fact."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: Research findings are written down for someone else to act on.
conditions_does_not_apply_when: The finding is a direct observation of the code.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the claim
  - its tag
  - its source
artifact_contract_verified_by: every claim carries a tag and no assumed claim reads as verified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# Tag every claim with the strength of its source
Every factual claim in RESEARCH.md must be tagged with its source:
Claims tagged `[ASSUMED]` signal to the planner and discuss-phase that the information needs user confirmation before becoming a locked decision.
Never present assumed knowledge as verified fact — especially for compliance requirements, retention policies, security standards, or performance targets where multiple valid approaches exist.
Never present LOW confidence findings as authoritative.
