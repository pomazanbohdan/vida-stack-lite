---
instruction_id: give-every-constraint-its-reason
title: Give every constraint its reason
summary: "A constraint states the why, because a constraint without a rationale gets questioned later."
capability_tags:
  - clarify-requirements
pattern_tags:
  - decision-trail
conditions_applies_when: A constraint is written down.
conditions_does_not_apply_when: The constraint is already recorded with its reason.
artifact_contract_output_type: constraint-list
artifact_contract_required_data:
  - each constraint
  - the reason it exists
artifact_contract_verified_by: every constraint carries the reason it exists
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a generic Type/What/Why notation for any written constraint and says reasons prevent challenges; it does not identify a supported domain, so domain assignment would rely on missing context."
---

# Give every constraint its reason
- **[Type]**: [What] — [Why]
Include the "why" — constraints without rationale get questioned
