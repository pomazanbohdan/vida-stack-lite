---
instruction_id: publish-parents-before-children
title: Publish parents before children
summary: Every parent is created before its children and every prerequisite before what waits on it; a prerequisite that is still local joins the publication scope.
capability_tags:
  - plan-implementation
pattern_tags:
  - program-orchestration
conditions_applies_when: Work items are published to a remote system.
conditions_does_not_apply_when: Nothing is published.
artifact_contract_output_type: publication-order
artifact_contract_required_data:
  - the order
  - the items that join the publication scope
artifact_contract_verified_by: every parent and every prerequisite was published before the item that waits on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Publish parents before children
Create parents before children, and a prerequisite before what waits on it.
A prerequisite that is still local joins the proposed publication scope.
