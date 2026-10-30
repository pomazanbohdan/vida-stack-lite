---
instruction_id: write-standing-orders-that-never-complete
title: Write standing orders that never complete
summary: Standing orders are always active and never finish; each one is adapted to the domain with an example and is testable from a session log.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An agent is given behaviour that stays switched on for the whole relationship.
conditions_does_not_apply_when: The behaviour belongs to one task and ends with it.
artifact_contract_output_type: standing-orders
artifact_contract_required_data:
  - the standing order
  - its example
  - the evidence that shows it ran
artifact_contract_verified_by: each standing order is testable from a session log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CREED-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write standing orders that never complete
These are always active. They never complete.
each domain-adapted with an example, plus any the domain demands; each testable from a session log.
