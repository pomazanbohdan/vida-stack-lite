---
instruction_id: close-an-epic-with-a-refactor-sweep
title: Close a container with a refactor sweep
summary: "A container of more than three items closes with a cleanup item that waits on every other one, takes cleanup only, and is offered by default."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A container has more than three items and the cleanup it will leave behind has to land somewhere.
conditions_does_not_apply_when: The container has three or fewer items.
artifact_contract_output_type: closing-item
artifact_contract_required_data:
  - the closing item
  - the scope it takes
  - the decision line when the user declines
artifact_contract_verified_by: the container closes with a cleanup item that waits on every other item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Close a container with a refactor sweep
An epic of more than three entries gets a closing story "Refactor sweep" that waits on every other entry except a closing end-to-end suite. Its scope is set when it starts, from the plans and the review findings deferred during the epic. It takes cleanup only; scope pushed out of another story is a new story. Propose it by default; when the user declines, record a `Decision:` line in the epic's Notes.
One closing end-to-end suite across the epic, after the sweep, is offered when the source has a test plan or the user wants one.
