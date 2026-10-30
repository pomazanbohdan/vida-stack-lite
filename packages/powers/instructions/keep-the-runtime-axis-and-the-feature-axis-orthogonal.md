---
instruction_id: keep-the-runtime-axis-and-the-feature-axis-orthogonal
title: Keep the runtime axis and the feature axis orthogonal
summary: "Where the engine runs and what the engine does are two separate axes: the same feature behaves the same way on every host, and the same host runs any set of features without knowing about them."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A host integration and a feature extension are being described together.
conditions_does_not_apply_when: There is only one of the two axes in play.
artifact_contract_output_type: orthogonal-axes
artifact_contract_required_data:
  - the runtime axis
  - the feature axis
  - the independence between them
artifact_contract_verified_by: the two axes stay independent and the feature behaves the same on every host
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep the runtime axis and the feature axis orthogonal
- **Capabilities are about *what* GSD does** — feature plug-ins that attach at GSD's Loop Extension Points inside the loop that is already running.
- A host integration and a capability are orthogonal axes: the same capability behaves identically regardless of which host is running the loop, and the same host runs any composed set of capabilities without knowing anything about them.
