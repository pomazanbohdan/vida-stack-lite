---
instruction_id: synthesize-the-findings-instead-of-concatenating-them
title: Synthesize the findings instead of concatenating them
summary: Parallel results are integrated into one conclusion; a section that only copies the sources side by side has synthesised nothing.
capability_tags:
  - define-output-format
pattern_tags:
  - technical-writing
conditions_applies_when: The outputs of several parallel workers are being merged into one document.
conditions_does_not_apply_when: There is only one source and nothing to integrate.
artifact_contract_output_type: synthesis-document
artifact_contract_required_data:
  - the conclusion the sources jointly support
  - the source each part of it comes from
artifact_contract_verified_by: "the reader gets a conclusion that no single source states, not a list of the sources"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-research-synthesizer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-research-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
  - operations
---

# Synthesize the findings instead of concatenating them
**Synthesized, not concatenated:** Findings are integrated, not just copied
Someone reading only this section should understand the research conclusions.
