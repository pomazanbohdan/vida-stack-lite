---
instruction_id: label-every-citation-as-preprint-or-peer-reviewed
title: Label every citation as preprint or peer-reviewed
summary: Label every citation as preprint or peer-reviewed; a preprint is not acceptance.
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A citation is carried into the result.
conditions_does_not_apply_when: "The source is not a paper: a specification, a filing or a product page carries no review status."
artifact_contract_output_type: citation-record
artifact_contract_required_data:
  - the citation
  - "its status: preprint or peer-reviewed"
artifact_contract_verified_by: every citation carries its peer-review status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 1
---

# Label every citation as preprint or peer-reviewed
label preprint vs peer-reviewed on every citation — arXiv is not acceptance
