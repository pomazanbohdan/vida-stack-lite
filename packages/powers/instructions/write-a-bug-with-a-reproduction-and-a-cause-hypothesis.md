---
instruction_id: write-a-bug-with-a-reproduction-and-a-cause-hypothesis
title: Write a bug with a reproduction and a cause hypothesis
summary: "A defect item carries the exact steps, what happens against what should happen, and a hypothesis about the cause — never a fix — and names the outcome that says no change was needed."
capability_tags:
  - plan-implementation
pattern_tags:
  - systematic-debugging
conditions_applies_when: A defect is written up as a work item.
conditions_does_not_apply_when: The work item describes a new behaviour rather than a defect.
artifact_contract_output_type: defect-item
artifact_contract_required_data:
  - the reproduction
  - the cause hypothesis
  - the tests for the condition
  - the proof that no change is needed
artifact_contract_verified_by: the item names a reproduction and a hypothesis and never a fix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/bug-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Write a bug with a reproduction and a cause hypothesis
A bug carries a reproduction and a cause hypothesis, never a fix.
Exact steps, environment, and what happens versus what should happen. Logs or errors verbatim.
Where the defect likely lives and why — a hypothesis, never a prescribed fix.
Missing steps: ask; unclear: tighten until someone else could follow them.
Run them when cheap; if the behavior already holds, say so with evidence and create nothing.
Criteria include tests for the condition found and fixed, and name the other valid outcome: proof no change is needed.
