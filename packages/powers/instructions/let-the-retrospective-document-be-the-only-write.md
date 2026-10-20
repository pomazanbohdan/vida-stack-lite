---
instruction_id: let-the-retrospective-document-be-the-only-write
title: Let the retrospective document be the only write
summary: "The run writes the retrospective document and nothing else: no status changes, no marks on the records, and no edit to the plan or the story."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: A retrospective finishes and the run is about to end.
conditions_does_not_apply_when: The person approved decision records that are written beside the code.
artifact_contract_output_type: run-write-set
artifact_contract_required_data:
  - the document path
  - the verdict
  - the action-item count
  - the path of each decision record written
artifact_contract_verified_by: "the run reports the document, the verdict, the count and the written records, and changed no other file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/retro-document.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 2
---

# Let the retrospective document be the only write
Report the document's path, the verdict, the action-item count, and the path of each decision record written. Nothing else was written: no status changed, and no tree file was edited.
Besides the decision records the user approved, the document is the run's only write: no status change,
no edit to the epic file, any plan, or any story file.
Outside the tree it writes only the decision records the user approves, each beside the code it governs or in the decisions folder when system-wide, and only in interactive runs.
