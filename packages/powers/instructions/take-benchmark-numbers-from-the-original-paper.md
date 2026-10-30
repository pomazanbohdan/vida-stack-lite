---
instruction_id: take-benchmark-numbers-from-the-original-paper
title: Take benchmark numbers from the original paper
summary: "Take a benchmark number from the paper that produced it, never from a competitor's comparison table."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A performance or quality number is carried into the result.
conditions_does_not_apply_when: No original paper exists for the number; a price or a headcount is taken from its owner.
artifact_contract_output_type: benchmark-record
artifact_contract_required_data:
  - the number
  - the paper it was taken from
artifact_contract_verified_by: "every number names the paper it came from and not a third party's table"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Take benchmark numbers from the original paper
take benchmark numbers from the original paper, never from a competitor's comparison table
