---
instruction_id: list-the-canonical-references-with-full-paths-in-a-dedicated-section
title: List the canonical references with full paths in a dedicated section
summary: The documents that define the requirements are listed with their full paths in one section that every later step reads.
capability_tags:
  - clarify-requirements
pattern_tags:
  - source-hierarchy
conditions_applies_when: The decision document is written.
conditions_does_not_apply_when: The project has no external specifications.
artifact_contract_output_type: canonical-references
artifact_contract_required_data:
  - each document with its full path
  - what it decides
artifact_contract_verified_by: "the section exists with full paths, or it says explicitly that there are no external specifications"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# List the canonical references with full paths in a dedicated section
**CRITICAL — Canonical references:** - The `<canonical_refs>` section is MANDATORY. Every CONTEXT.md must have one.
Inline mentions like "see ADR-019" scattered in decisions are useless to downstream agents — they need full paths and section references in a dedicated section they can find
If no external specs exist, say so explicitly — don't silently omit the section
