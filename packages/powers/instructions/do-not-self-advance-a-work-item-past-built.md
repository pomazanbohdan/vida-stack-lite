---
instruction_id: do-not-self-advance-a-work-item-past-built
title: Do not self-advance a work item past built
summary: "The build may finish the work, but it does not close it: only the user, or an orchestrator acting for them, moves an item to done."
capability_tags:
  - plan-implementation
pattern_tags:
  - plan-execution
conditions_applies_when: The build of a work item has finished.
conditions_does_not_apply_when: The user asked you to close the item.
artifact_contract_output_type: status-decision
artifact_contract_required_data:
  - the status the build reached
  - who may close it
  - the reason the status was not moved
artifact_contract_verified_by: the item was not moved past built without the user asking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/break-work-into-stories-and-track-it.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not self-advance a work item past built
No skill moves a ticket past `built`, which means the build finished and nobody has called it done.
When the user says a ticket is done, mark it for them.
Absent until the first ticket under it starts, then `in-progress`, and `done` or `dropped` when the user confirms it
A build finishes at `built`, shown in the review column; the user or orchestrator decides when to mark it `done`.
A tracker card's status remains separate from build status.
A review never changes `status`.
