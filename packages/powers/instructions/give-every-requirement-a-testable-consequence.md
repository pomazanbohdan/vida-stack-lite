---
instruction_id: give-every-requirement-a-testable-consequence
title: Give every requirement a testable consequence
summary: "Each requirement carries at least one verifiable consequence, and the non-functional sections state bounds instead of adjectives."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirements document is being written or reviewed.
conditions_does_not_apply_when: The document is a narrative that carries no requirements.
artifact_contract_output_type: testable-consequences
artifact_contract_required_data:
  - the consequence of each requirement
  - the adjectives that were replaced by bounds
artifact_contract_verified_by: every requirement names a verifiable condition and no bound is an adjective
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-validation-checklist.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/nyquist-validation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Give every requirement a testable consequence
FRs with at least one testable consequence per FR — verifiable condition, measurable outcome.
"System handles X gracefully," "reasonable performance," "user-friendly" — flag every one.
For non-functional sections (UX, performance, security): bounds, not adjectives.
This is the dimension downstream story creation will lean on hardest. Be unforgiving here.

A good requirement is specific and testable, user-centric, atomic - one capability per requirement - and independent of the other requirements.
Reject the vague ones: "Handle authentication" becomes "User can log in with email and password and stay logged in across sessions".
Map automated test coverage to phase requirements before any code is written.
System MUST map each requirement to a specific test command
System MUST identify Wave 0 tasks (test scaffolding needed before implementation)
ensures a feedback signal exists for every requirement
