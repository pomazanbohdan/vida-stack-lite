---
instruction_id: cover-every-roadmap-requirement-in-at-least-one-plan
title: Cover every roadmap requirement in at least one plan
summary: Every requirement of the roadmap appears in at least one plan; an unmapped requirement is a gap in the roadmap.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A phase is broken into plans.
conditions_does_not_apply_when: The phase has no roadmap requirements.
artifact_contract_output_type: requirement-coverage
artifact_contract_required_data:
  - the requirement identifiers each plan covers
artifact_contract_verified_by: every roadmap requirement appears in at least one plan and the unmapped count is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/phase-prompt.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/requirements.md
status: active
revision: 1
---

# Cover every roadmap requirement in at least one plan
**MUST** list requirement IDs from ROADMAP. Every roadmap requirement MUST appear in at least one plan.
Unmapped requirements = roadmap gap
