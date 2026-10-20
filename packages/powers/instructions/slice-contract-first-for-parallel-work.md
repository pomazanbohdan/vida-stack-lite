---
instruction_id: slice-contract-first-for-parallel-work
title: Slice contract-first for parallel work
summary: "When two sides develop in parallel, define the contract first, build both sides against it, and integrate only at the end."
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: Two sides of the work are developed in parallel by different people or agents.
conditions_does_not_apply_when: One side is built entirely before the other starts.
artifact_contract_output_type: parallel-slice-plan
artifact_contract_required_data:
  - the contract slice
  - the slice each side builds against the contract
  - the integration slice
artifact_contract_verified_by: both sides are built against the same contract and the integration is the last slice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 1
---

# Slice contract-first for parallel work

When backend and frontend need to develop in parallel:

```
Slice 0: Define the API contract (types, interfaces, OpenAPI spec)
Slice 1a: Implement backend against the contract + API tests
Slice 1b: Implement frontend against mock data matching the contract
Slice 2: Integrate and test end-to-end
```
