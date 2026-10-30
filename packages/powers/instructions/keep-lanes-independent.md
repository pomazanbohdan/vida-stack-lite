---
instruction_id: keep-lanes-independent
title: Keep the lanes independent
summary: "A lane is a run of items that touch the same code; items in different lanes never touch the same code, and a boundary two lanes share gets its own interface and stub first."
capability_tags:
  - coordinate-program
pattern_tags:
  - parallel-execution
conditions_applies_when: Items in a breakdown can run in parallel.
conditions_does_not_apply_when: The items run one after the other and share nothing.
artifact_contract_output_type: lane-plan
artifact_contract_required_data:
  - the lanes
  - the items in each lane
  - the shared boundary and its owner
artifact_contract_verified_by: no two items in different lanes touch the same code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the lanes independent
A lane is a run of stories that touch the same code, in order; stories in different lanes never touch the same code. Two that would are one story, or one waits on the other.
A boundary two lanes share gets its interface and a stub as its own early story, so both lanes open at once.
Collisions: two items with no dependency path between them can run at the same time, so they share no code, config, schema, or setup. Where they would, one goes in the other's `after` or they merge.
