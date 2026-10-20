---
instruction_id: name-the-decision-the-research-serves
title: Name the decision the research serves
summary: "The research document states the decision it serves, in its metadata and at the top of its body."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is opened.
conditions_does_not_apply_when: The document is a throwaway note with no decision behind it.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the decision the research serves
artifact_contract_verified_by: the decision appears in the metadata and at the top of the document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/research.template.md
status: active
revision: 1
---

# Name the decision the research serves
decision: '{decision}'

**Decision this research serves:** {decision}
