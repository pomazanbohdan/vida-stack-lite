---
instruction_id: write-the-summary-and-commit-it-before-you-narrate
title: Write the summary and commit it before you narrate
summary: The summary is committed before the agent says anything about it.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - completion-criteria
conditions_applies_when: A delegated agent has produced the summary of its work.
conditions_does_not_apply_when: The agent produced no summary.
artifact_contract_output_type: commit
artifact_contract_required_data:
  - the summary
  - the commit
artifact_contract_verified_by: the summary was committed before the agent said anything about it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the summary and commit it before you narrate
REQUIRED ORDER: Write the summary
→ commit → only then any narration.
Do NOT skip or defer this commit
