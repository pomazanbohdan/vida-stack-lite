---
instruction_id: draw-the-flow-not-the-file-list
title: "Draw the flow, not the file list"
summary: The diagram shows how data moves through conceptual components so a reader can trace the use case by following the arrows.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A system is described with a diagram.
conditions_does_not_apply_when: The document describes a single file.
artifact_contract_output_type: flow-diagram
artifact_contract_required_data:
  - the entry points
  - the processing stages
  - the decision points
artifact_contract_verified_by: the primary use case can be traced from input to output by following the arrows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research.md
status: active
revision: 1
---

# Draw the flow, not the file list
Architecture diagrams MUST show data flow through conceptual components, not file listings.
A reader should be able to trace the primary use case from input to output by following the arrows
File-to-implementation mapping belongs in the Component Responsibilities table, not in the diagram.
