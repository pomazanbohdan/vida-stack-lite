---
instruction_id: keep-the-implementation-notes-append-only
title: Keep the implementation notes append-only
summary: "The implementation notes record the decisions, the files touched and the surprises; they are appended to and never removed."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The implementation records what it decided and what it found.
conditions_does_not_apply_when: The work leaves no notes to record.
artifact_contract_output_type: implementation-notes
artifact_contract_required_data:
  - the decisions made
  - the files touched
  - the surprises encountered
artifact_contract_verified_by: the notes grew with the work and nothing was deleted from them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the implementation notes append-only
Agent-owned. Append-only during implementation: decisions made, files touched, surprises encountered. Never delete this section.
