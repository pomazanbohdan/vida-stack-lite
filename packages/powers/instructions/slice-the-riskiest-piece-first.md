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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 2
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
