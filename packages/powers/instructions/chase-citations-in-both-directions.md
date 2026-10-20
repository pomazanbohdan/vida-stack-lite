---
instruction_id: chase-citations-in-both-directions
title: Chase citations in both directions
summary: "Chase the citations in both directions: who the paper cites and who cites the paper, to find the work it stands on and the work that stands on it."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A paper has to be placed in the body of work around it.
conditions_does_not_apply_when: "The source has no citation graph, such as a regulation, a filing or a pricing page."
artifact_contract_output_type: citation-graph
artifact_contract_required_data:
  - the references the paper cites
  - the papers that cite it
artifact_contract_verified_by: both directions were followed and each side is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 1
---

# Chase citations in both directions
chase citations both directions — who they cite and who cites them (Semantic Scholar/Google Scholar)
