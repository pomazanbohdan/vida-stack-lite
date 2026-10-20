---
instruction_id: record-the-ask-the-ticket-and-the-prior-document
title: "Record the ask, the ticket and the prior document"
summary: "A codebase research document records the ask it answers, the ticket it came from when it came from one, and the prior document it follows up when it follows one up."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A codebase research document is opened.
conditions_does_not_apply_when: The ask came from no ticket and follows no prior document; both lines are dropped.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the ask
  - the ticket the ask came from
  - the prior document that is followed up
artifact_contract_verified_by: the ask is stated and the ticket and prior-document lines are present only when they apply
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# Record the ask, the ticket and the prior document
ask: |-
{ask}
ticket: '{ticket ref or file; drop this line when the ask came from no ticket}'
follow_up_of: '{prior document; drop this line unless the ask follows one up}'
