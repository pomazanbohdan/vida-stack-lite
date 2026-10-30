---
instruction_id: name-the-canonical-sources-the-consumers-must-read
title: Name the canonical sources the consumers must read
summary: "The context names the documents every later agent has to read, with full paths, and says so when there are none."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The context is handed to the agents that will work from it.
conditions_does_not_apply_when: No external document is referenced.
artifact_contract_output_type: canonical-reference-list
artifact_contract_required_data:
  - each referenced document with its full path
  - what it decides
  - the statement that there are none
artifact_contract_verified_by: every referenced document carries a full path and the empty case is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/prd-express-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Name the canonical sources the consumers must read
Downstream agents MUST read these before planning or implementing.
plus any specs/ADRs referenced in the PRD — expand to full file paths
If no external specs: "No external specs — requirements fully captured in decisions above"
