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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Cover every roadmap requirement in at least one plan
**MUST** list requirement IDs from ROADMAP. Every roadmap requirement MUST appear in at least one plan.
Unmapped requirements = roadmap gap
