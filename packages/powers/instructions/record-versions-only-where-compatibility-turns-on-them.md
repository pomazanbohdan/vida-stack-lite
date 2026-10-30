---
instruction_id: record-versions-only-where-compatibility-turns-on-them
title: Record versions only where compatibility turns on them
summary: "A version number is recorded where breaking changes or compatibility matter, not everywhere."
capability_tags:
  - explain-subsystem
pattern_tags:
  - pinned-stack-table
conditions_applies_when: A technology list is written down.
conditions_does_not_apply_when: The list is a pinned table of every technology.
artifact_contract_output_type: technology-list
artifact_contract_required_data:
  - the technologies that carry a version
  - the reason the version matters
artifact_contract_verified_by: a version is present only where compatibility or breaking changes turn on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/codebase/stack.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/STACK.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Record versions only where compatibility turns on them
Specify versions only when version matters (breaking changes, compatibility)
Standard stack: Specific versions, not just names
Include specific version numbers
Explain why this is the standard choice, not just what it does
