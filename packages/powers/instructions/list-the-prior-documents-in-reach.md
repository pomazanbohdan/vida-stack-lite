---
instruction_id: list-the-prior-documents-in-reach
title: List the prior documents in reach
summary: "The research documents and decision records in reach are listed by title, and when the ask follows one up, that one is named and the reason is given."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is written and prior documents exist.
conditions_does_not_apply_when: No prior document or decision record is in reach.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the prior documents by title
  - the one followed up and why
artifact_contract_verified_by: every prior document in reach is listed by title
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# List the prior documents in reach
## Prior documents

research documents and ADRs in reach, by title; when the ask follows one up, which one and why
