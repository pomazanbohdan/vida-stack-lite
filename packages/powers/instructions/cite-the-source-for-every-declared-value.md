---
instruction_id: cite-the-source-for-every-declared-value
title: Cite the source for every declared value
summary: "Every value that is declared about an outside system carries a citation and the evidence quote behind it, or the explicit unknown sentinel."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A value about an outside system is being declared.
conditions_does_not_apply_when: The value is a property of the system being built.
artifact_contract_output_type: cited-declaration
artifact_contract_required_data:
  - the declared value
  - the source it is cited from
  - the evidence quote behind it
artifact_contract_verified_by: every declared value carries a citation or the unknown sentinel
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/host-integration-capability-matrix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Cite the source for every declared value
- Every per-CLI axis value is either:
- **documented** — backed by a cited authoritative source and evidence quote, or
- **`undocumented`** — the explicit fail-closed sentinel used when the CLI's public documentation does not state a value for that axis.
- Values are generated from per-CLI documentation research (Context7 + official docs). They are consumed verbatim by `gen:capability-registry` and validated by `capability-validator.cjs`.
