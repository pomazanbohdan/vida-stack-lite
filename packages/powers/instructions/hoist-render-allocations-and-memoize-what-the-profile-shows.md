---
instruction_id: hoist-render-allocations-and-memoize-what-the-profile-shows
title: Hoist render allocations and memoize what the profile shows
summary: "An object or function created in render is a new reference every time and re-renders every child that receives it, and memoization is reserved for work the profile shows is expensive."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A component tree re-renders children it did not need to.
conditions_does_not_apply_when: The rendering cost has not been measured at all.
artifact_contract_output_type: render-change
artifact_contract_required_data:
  - the allocation
  - the hoist
  - the profile evidence for the memoization
artifact_contract_verified_by: the profile names the work the memoization was added for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Hoist render allocations and memoize what the profile shows

An object or function created in render is a new reference every time and re-renders every child that receives it.
Hoist constants; reserve `React.memo` and `useMemo` for work the profile shows is expensive, since overuse is its own cost.
