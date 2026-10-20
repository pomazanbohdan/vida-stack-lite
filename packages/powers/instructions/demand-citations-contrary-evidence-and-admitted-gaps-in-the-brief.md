---
instruction_id: demand-citations-contrary-evidence-and-admitted-gaps-in-the-brief
title: "Demand citations, contrary evidence and admitted gaps in the brief"
summary: "The prompt handed to an outside research tool makes the citation demand non-negotiable, asks for contrary evidence, and admits the gaps instead of padding them."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A research prompt is being composed for an outside tool.
conditions_does_not_apply_when: The research runs here and no prompt leaves the session.
artifact_contract_output_type: research-brief
artifact_contract_required_data:
  - the citation demand
  - the request for contrary evidence
  - the request to admit the gaps
artifact_contract_verified_by: "the prompt names the citation demand, asks for contrary evidence and asks for the gaps to be admitted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/draft.md
status: active
revision: 1
---

# Demand citations, contrary evidence and admitted gaps in the brief
- **non-negotiable citation demand**: every claim with source URL and publication date, contrary evidence reported, gaps admitted rather than padded.
- the dimensions as explicit research questions pruned to the decision, the freshness bars as recency requirements, the two-source expectation for its critical claim classes, the audience
