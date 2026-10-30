---
instruction_id: keep-the-imported-original-untouched-in-one-place
title: Keep the imported original untouched in one place
summary: "The imported document is copied into the workspace untouched, so that the full fidelity lives in exactly one place and nowhere else."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: An externally produced report is taken into the workspace.
conditions_does_not_apply_when: The material was produced inside the workspace.
artifact_contract_output_type: imported-original
artifact_contract_required_data:
  - the untouched original
  - the place it is kept
artifact_contract_verified_by: the original is preserved untouched in one place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/process.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the imported original untouched in one place
Move or copy the original into `{doc_workspace}/imports/` untouched — full fidelity is preserved there, and nowhere else.
