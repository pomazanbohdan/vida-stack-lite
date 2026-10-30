---
instruction_id: keep-acceptance-criteria-out-of-the-matrix
title: Keep acceptance criteria out of the matrix
summary: The edge-case matrix carries the input and output scenarios; the acceptance criteria carry the system-level behaviour the matrix does not capture.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The plan carries both an edge-case matrix and acceptance criteria.
conditions_does_not_apply_when: The plan has no edge-case matrix.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the system-level behaviours
  - the scenarios that stay in the matrix
artifact_contract_verified_by: no matrix scenario is repeated in the acceptance criteria and every system-level behaviour has one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep acceptance criteria out of the matrix
If an I/O Matrix is present, include a task to unit-test its edge cases.
AC covers system-level behaviors not captured by the I/O Matrix. Do not duplicate I/O scenarios here.
