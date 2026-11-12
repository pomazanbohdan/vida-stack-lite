---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-incremental-implementation-skill-md-487dfa30-c02"
title: "addy-skills: skills/incremental-implementation/SKILL.md module"
summary: "Carrier for 2 atomic instructions from addy-skills:skills/incremental-implementation/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/incremental-implementation/SKILL.md\"}"
atom_ids:
  - slice-contract-first-for-parallel-work
  - slice-the-riskiest-piece-first
atom_count: 2
atoms: "[{\"atom_id\":\"slice-contract-first-for-parallel-work\",\"file_sha256\":\"82a7312587d4f8185569c7356cabead5618370a7f60129f57d87a98e80eadcf0\",\"content_sha256\":\"77c10322a40a6a2f05e2b7191c6ebbc183e81541807356131b747487d6eaf9a9\",\"file_bytes\":1508,\"body_bytes\":342},{\"atom_id\":\"slice-the-riskiest-piece-first\",\"file_sha256\":\"18ace7fb65d8a563544060ecbb06792e97980eee7dd9ead3c20e420fff19e061\",\"content_sha256\":\"18af4514ed918e6571c22d0b5b863697b0ab3fa2176732c59afeee4092f990c4\",\"file_bytes\":1609,\"body_bytes\":394}]"
carrier_sha256: de7b939450f5f75eefde8d7adf292c94e1bc63139eaa3accc1f01e3dcbfa3303
carrier_bytes: 3368
revision: 1
status: active
---
<!-- vpmodule:atom:begin slice-contract-first-for-parallel-work -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Slice contract-first for parallel work

When backend and frontend need to develop in parallel:

```
Slice 0: Define the API contract (types, interfaces, OpenAPI spec)
Slice 1a: Implement backend against the contract + API tests
Slice 1b: Implement frontend against mock data matching the contract
Slice 2: Integrate and test end-to-end
```
<!-- vpmodule:atom:end slice-contract-first-for-parallel-work -->
<!-- vpmodule:atom:begin slice-the-riskiest-piece-first -->
---
instruction_id: slice-the-riskiest-piece-first
title: Slice the riskiest piece first
summary: Order the slices so the riskiest or most uncertain piece comes first and can fail before the rest is built on it.
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: A delivery can be cut into slices and one part carries the most uncertainty.
conditions_does_not_apply_when: Every part of the work carries the same risk.
artifact_contract_output_type: slice-order
artifact_contract_required_data:
  - the riskiest slice and its risk
  - the slices that follow it
artifact_contract_verified_by: "the first slice is the one that can fail, and it comes before the work that depends on it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Slice the riskiest piece first

Tackle the riskiest or most uncertain piece first:

```
Slice 1: Prove the WebSocket connection works (highest risk)
Slice 2: Build real-time task updates on the proven connection
Slice 3: Add offline support and reconnection
```

If Slice 1 fails, you discover it before investing in Slices 2 and 3.
Order by risk — most likely to kill the idea runs first.
<!-- vpmodule:atom:end slice-the-riskiest-piece-first -->