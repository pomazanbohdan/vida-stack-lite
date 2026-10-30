---
instruction_id: name-the-gray-areas-specifically
title: Name the gray areas specifically
summary: "The open decisions are named for this piece of work, not by generic category label."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The open decisions of a unit of work are being listed for the user to choose from.
conditions_does_not_apply_when: The decision is technical implementation detail that the team settles itself.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the area name
  - the specific ambiguity
  - the code context that touches it
artifact_contract_verified_by: no area is named with a generic category label
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives generic user-choice clarification guidance and excludes team-owned technical details, but identifies no supported product or other domain."
---

# Name the gray areas specifically
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.
**Don't use generic category labels** (UI, UX, Behavior). Generate specific gray areas.
**Claude handles these (don't ask):** technical implementation details, architecture patterns, performance optimization, scope (roadmap defines this).
