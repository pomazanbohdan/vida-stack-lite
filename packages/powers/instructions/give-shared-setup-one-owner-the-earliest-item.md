---
instruction_id: give-shared-setup-one-owner-the-earliest-item
title: "Give shared setup one owner, the earliest item"
summary: "Whatever more than one item needs — the harness, the scaffold, the schema, a shared component or an integration — has one owner: the earliest item that needs it."
capability_tags:
  - coordinate-program
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one item needs the same setup.
conditions_does_not_apply_when: Each item needs its own setup.
artifact_contract_output_type: setup-ownership
artifact_contract_required_data:
  - the shared setup
  - its owner
  - the items that list it as a dependency
artifact_contract_verified_by: the shared setup has one owner and the other items list it as a dependency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/set-up-the-ticket-tree.md
status: active
revision: 2
---

# Give shared setup one owner, the earliest item
Shared setup: whatever more than one item needs (test harness, scaffold, schema, a shared component or contract, an integration) has one owner, the earliest item that needs it, and the others list it in `after`.
If you decline, each becomes a story in the opening epic that the other epics wait on.
