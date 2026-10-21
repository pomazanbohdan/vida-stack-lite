---
instruction_id: derive-the-status-of-each-requirement-from-independent-sources
title: Derive the status of each requirement from independent sources
summary: "The status of every requirement comes from cross-referencing three independent sources through a fixed matrix, so one source cannot decide the outcome on its own."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: The status of a requirement is decided at the end of a body of work.
conditions_does_not_apply_when: The status has already been decided and recorded.
artifact_contract_output_type: requirement-status-matrix
artifact_contract_required_data:
  - the three sources
  - the status each combination yields
artifact_contract_verified_by: no status was taken from a single source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-milestone.md
status: active
revision: 1
---

# Derive the status of each requirement from independent sources
MUST cross-reference three independent sources for each requirement:
For each REQ-ID, determine status using all three sources:
Status matrix:
| passed | listed | `[x]` | **satisfied** |
| passed | listed | `[ ]` | **satisfied** (update checkbox) |
| passed | missing | any | **partial** (verify manually) |
| gaps_found | any | any | **unsatisfied** |
| missing | listed | any | **partial** (verification gap) |
| missing | missing | any | **unsatisfied** |
