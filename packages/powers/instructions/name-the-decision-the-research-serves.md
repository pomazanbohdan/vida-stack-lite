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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project/detail/elaboration.md
status: active
revision: 2
---

# Name the decision the research serves
decision: '{decision}'

**Decision this research serves:** {decision}

Give every parallel researcher its own dimension, its own question, the note of what the next stage needs from its output, and a quality gate.
In a later cycle, research only what the new work needs; do not re-research what already exists.
