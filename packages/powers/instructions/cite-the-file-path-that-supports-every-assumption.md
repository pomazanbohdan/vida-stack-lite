---
instruction_id: cite-the-file-path-that-supports-every-assumption
title: Cite the file path that supports every assumption
summary: "No assumption is stated without the source file that supports it, and code that was not read is not reasoned about."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: Assumptions about how the codebase behaves are written down.
conditions_does_not_apply_when: "The statement is a decision the user made, not a reading of the code."
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumption
  - the file path that supports it
artifact_contract_verified_by: every assumption carries at least one file path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Cite the file path that supports every assumption
Every assumption MUST cite at least one file path as evidence.
Do NOT invent assumptions about code you haven't read -- read first, then form opinions
