---
instruction_id: the-set-must-satisfy-the-done-when
title: The set must satisfy the done when
summary: "The items of a set account for every requirement and for the work that has no id, and their combined result satisfies the container's done condition; citing an id alone is not coverage."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: "A set of items is checked against the container's done condition."
conditions_does_not_apply_when: The container has no done condition.
artifact_contract_output_type: coverage-check
artifact_contract_required_data:
  - the requirements and the work the set accounts for
  - the part each item delivers
  - how the combined result satisfies the done condition
artifact_contract_verified_by: the combined result satisfies the done condition and no id is cited as coverage on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# The set must satisfy the done when
Together the tickets account for every requirement in the epic's spec, referenced numbered source, or Requirements, except scope deferred with the user. Each `covers` id exists there; several tickets may cover one id, each description saying which part it delivers.
UX, architecture, constraints, and integration work are accounted for even when they lack ids. The combined results must satisfy the epic's Done when; citing an id alone is not coverage.
