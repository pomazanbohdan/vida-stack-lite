---
instruction_id: resolve-drift-by-making-the-two-records-equal
title: Resolve drift by making the two records equal
summary: "When the two records of one item disagree, both values are shown to the user and the records are made equal."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two records of the same work item disagree.
conditions_does_not_apply_when: The records agree.
artifact_contract_output_type: drift-resolution
artifact_contract_required_data:
  - both values
  - the change that makes them equal
artifact_contract_verified_by: the two values were shown to the user and made equal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resolve drift by making the two records equal
The leaf file's `after` or `hitl` differs from the entry's; the row gives both values
Show them to the user and make them equal
