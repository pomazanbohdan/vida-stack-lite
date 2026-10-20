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
status: active
revision: 1
---

# Give every requirement a testable consequence
FRs with at least one testable consequence per FR — verifiable condition, measurable outcome.
"System handles X gracefully," "reasonable performance," "user-friendly" — flag every one.
For non-functional sections (UX, performance, security): bounds, not adjectives.
This is the dimension downstream story creation will lean on hardest. Be unforgiving here.
