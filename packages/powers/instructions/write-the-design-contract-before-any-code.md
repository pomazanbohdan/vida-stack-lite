---
instruction_id: write-the-design-contract-before-any-code
title: Write the design contract before any code
summary: "A design that would otherwise produce divergent implementations is written down as a contract before the code is written, because the contract is cheaper to write than the divergence is to undo."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - specification-gate
conditions_applies_when: A piece of work has a visual or interaction surface that could be implemented in more than one way.
conditions_does_not_apply_when: The surface is unambiguous.
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the design contract
  - the surface it describes
  - the point at which it was written
artifact_contract_verified_by: "the design contract was written before any code and describes the layout, interaction and behavior"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
status: active
revision: 1
---

# Write the design contract before any code
- It produces a `UI-SPEC.md` — a design contract that describes layout, interaction, and visual behaviour before any code is written.
- A clear design contract is far cheaper to write than to re-implement.
