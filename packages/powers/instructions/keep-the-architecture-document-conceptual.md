---
instruction_id: keep-the-architecture-document-conceptual
title: Keep the architecture document conceptual
summary: "The architecture document names the layers and their relations; file listings, technology choices and feature details belong elsewhere."
capability_tags:
  - explain-subsystem
pattern_tags:
  - subsystem-explanation
conditions_applies_when: The architecture of a codebase is written down.
conditions_does_not_apply_when: The file listing of the codebase is being written.
artifact_contract_output_type: architecture-document
artifact_contract_required_data:
  - the layers and their relations
  - the paths that illustrate them
artifact_contract_verified_by: "the document holds no exhaustive file listing, no technology list and no feature detail"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/codebase/architecture.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the architecture document conceptual
**What does NOT belong here:** - Exhaustive file listings (that's STRUCTURE.md) - Technology choices (that's STACK.md) - Line-by-line code walkthrough (defer to code reading) - Implementation details of specific features
**File paths ARE welcome:** Include file paths as concrete examples of abstractions.
