---
instruction_id: every-requirement-has-an-accountable-epic
title: Every requirement has an accountable container
summary: "Every requirement of the whole body of work has a container that owns it or an agreed deferral, and every unit the work touches is a container, a touch point or named out of scope."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A whole initiative is checked against its source.
conditions_does_not_apply_when: The check is on one container only.
artifact_contract_output_type: ownership-check
artifact_contract_required_data:
  - each requirement and the container that owns it
  - the agreed deferrals
  - the part each container delivers of a shared requirement
artifact_contract_verified_by: every requirement has an accountable container or an agreed deferral
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Every requirement has an accountable container
Every initiative requirement has an accountable epic or an agreed deferral. Shared requirements say which part each epic delivers; no unexplained overlap.
Every unit the source touches is an epic, a touch point (a unit the work only consumes or configures, named in the initiative's Boundaries with the epic that owns the work there), or named out of scope.

Map every requirement to exactly one phase, derive two to five success criteria per phase as observable behaviours, and validate the full coverage before the plan is accepted.
