---
instruction_id: split-requirements-into-validated-active-and-out-of-scope
title: "Split the requirements into validated, active and out of scope"
summary: "The requirements are split by how far they have got, and the out-of-scope list carries the reason so it is not re-added."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The requirement set of a project is written or revised.
conditions_does_not_apply_when: The requirement set is unchanged.
artifact_contract_output_type: requirement-tiers
artifact_contract_required_data:
  - the validated requirements
  - the active requirements
  - the excluded ones with their reasons
artifact_contract_verified_by: each requirement sits in exactly one of the three tiers and the exclusions carry a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/project.md
status: active
revision: 1
---

# Split the requirements into validated, active and out of scope
**Requirements — Validated:** - Requirements that shipped and proved valuable - Format: `- ✓ [Requirement] — [version/phase]` - These are locked — changing them requires explicit discussion
**Requirements — Active:** - Current scope being built toward - These are hypotheses until shipped and validated - Move to Validated when shipped, Out of Scope if invalidated
**Requirements — Out of Scope:** - Explicit boundaries on what we're not building - Always include reasoning (prevents re-adding later)
