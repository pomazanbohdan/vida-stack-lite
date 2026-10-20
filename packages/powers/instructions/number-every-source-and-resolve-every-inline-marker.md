---
instruction_id: number-every-source-and-resolve-every-inline-marker
title: Number every source and resolve every inline marker
summary: "Sources are numbered in a table that carries the claim each supports, its publisher, its dates and its confidence, and every inline marker resolves to a row."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report cites its sources.
conditions_does_not_apply_when: The text carries no citations.
artifact_contract_output_type: source-appendix
artifact_contract_required_data:
  - the numbered source table
  - the claim each source supports
artifact_contract_verified_by: every inline marker resolves to a row of the source table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/synthesis.md
status: active
revision: 1
---

# Number every source and resolve every inline marker
**Source appendix** — the numbered source table: `[n] | claim/finding it supports | publisher | pub date | accessed | confidence`, the publisher cell a markdown link to the source URL. Every inline `[n]` resolves here.
