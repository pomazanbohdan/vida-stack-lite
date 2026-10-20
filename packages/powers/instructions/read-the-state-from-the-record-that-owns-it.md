---
instruction_id: read-the-state-from-the-record-that-owns-it
title: Read the state from the record that owns it
summary: "The state of the work comes from the record that holds it, never from another file that happens to mention the work."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: You need to know where the work stands.
conditions_does_not_apply_when: The state was already read from its own record.
artifact_contract_output_type: state-source
artifact_contract_required_data:
  - the record that was read
  - the state it carried
artifact_contract_verified_by: the state was taken from the record that owns it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 2
---

# Read the state from the record that owns it
Do not infer workflow state from non-plan files.
Read the status, the blocking condition, and the follow-up review recommendation rather than inferring success from chat output alone.
The workflow always tries to leave behind a durable artifact describing what happened.
Monitor the plan file or fallback result file for terminal state
An older leaf file can still carry `status`.
It is read only when there is no plan.
