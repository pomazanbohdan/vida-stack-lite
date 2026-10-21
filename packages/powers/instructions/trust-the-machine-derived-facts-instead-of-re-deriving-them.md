---
instruction_id: trust-the-machine-derived-facts-instead-of-re-deriving-them
title: Trust the machine-derived facts instead of re-deriving them
summary: Cross-module facts that a tool produced are taken as ground truth and rendered in their own section; they are not recomputed by hand.
capability_tags:
  - verify-work-results
pattern_tags:
  - trust-graded-context
conditions_applies_when: A report has to carry cross-module facts that a tool already produced.
conditions_does_not_apply_when: The facts were produced by the reader itself.
artifact_contract_output_type: machine-derived-facts
artifact_contract_required_data:
  - the tool that produced the facts
  - the section they are rendered in
  - what is not recomputed
artifact_contract_verified_by: the machine-derived facts were used as given and not recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/contexts/review.md
status: active
revision: 1
---

# Trust the machine-derived facts instead of re-deriving them
- Treat as ground truth for cross-module facts; do not re-derive.
- Render in REVIEW.md under `## Structural Findings (fallow)` as a separate section from narrative findings.
