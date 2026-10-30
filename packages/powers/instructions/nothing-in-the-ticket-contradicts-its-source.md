---
instruction_id: nothing-in-the-ticket-contradicts-its-source
title: Nothing in the item contradicts its source
summary: "Nothing in the item contradicts the requirement source, its companions, the architecture or a recorded decision, and a conflict between the source and the code is written down and reported."
capability_tags:
  - verify-work-results
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A work item is checked against the sources it names.
conditions_does_not_apply_when: The item names no source.
artifact_contract_output_type: consistency-check
artifact_contract_required_data:
  - the sources checked
  - the recorded decision checked against
  - the conflict line when one was found
artifact_contract_verified_by: "nothing in the item contradicts its source, the architecture or a recorded decision"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Nothing in the item contradicts its source
Nothing contradicts the requirement source, its companions, the architecture, or a recorded decision.
Where the source contradicts the code or another source, add `Source conflict: <id or section> — <what the source says> vs <what was found>` to the Notes of the container whose source it is and tell the user
