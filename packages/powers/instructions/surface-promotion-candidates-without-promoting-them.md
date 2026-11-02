---
instruction_id: surface-promotion-candidates-without-promoting-them
title: Surface promotion candidates without promoting them
summary: "Recurring items are clustered across the recent phases and the candidates are offered for a decision; nothing is promoted until the developer says so, and the promotion is one atomic commit."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The recent phases produced learning records that can be compared.
conditions_does_not_apply_when: The promotion feature is switched off.
artifact_contract_output_type: promotion-candidates
artifact_contract_required_data:
  - the clusters
  - the phases each cluster appeared in
  - the decision per cluster
artifact_contract_verified_by: nothing was promoted without an explicit approval
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/graduation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Surface promotion candidates without promoting them
This workflow clusters recurring items across the last N phases' LEARNINGS.md files and surfaces promotion candidates to the developer via HITL. No item is promoted without explicit developer approval.
only surface clusters with distinct source phases
(not just total items — same item repeated in one phase still counts as 1 distinct phase)
Commit both the target file and all annotated LEARNINGS.md files in a single atomic commit:
