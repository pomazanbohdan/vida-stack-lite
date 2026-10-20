---
instruction_id: a-builder-must-be-able-to-write-the-criteria
title: A builder must be able to write the criteria
summary: "Given the container, the item and its references, a builder could write that item's acceptance criteria; when they could not, the container's requirements or the references are fixed instead."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: An item is checked for whether it can be built from.
conditions_does_not_apply_when: The item already carries its full criteria.
artifact_contract_output_type: buildability-check
artifact_contract_required_data:
  - "the container, the item and its references"
  - the criteria a builder could write from them
  - what is missing when they could not
artifact_contract_verified_by: "a builder could write the item's acceptance criteria from the container, the item and its references"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
status: active
revision: 1
---

# A builder must be able to write the criteria
Given the epic, an entry, and its references, a builder could write that story's acceptance criteria if it had to. If it could not, fix the epic's requirements or the references; the entry stays one sentence each for `description` and `verify`.
