---
instruction_id: measure-field-data-before-optimizing
title: Measure field data before optimizing
summary: "Real-user data comes first, the slow interaction is found in a recorded trace, and the result is checked on slower hardware before it is called fixed."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: An interface feels slow and the work is about to optimize it.
conditions_does_not_apply_when: The work does not touch a user-visible path.
artifact_contract_output_type: field-data-measurement
artifact_contract_required_data:
  - the field data
  - the recorded slow interaction
  - the hardware the result was checked on
artifact_contract_verified_by: the field data was read first and the slow interaction was reproduced on slower hardware
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
---

# Measure field data before optimizing
1. **Field data first** — check [CrUX Vis](https://developer.chrome.com/docs/crux/vis) or your RUM tool for real-user INP before optimising
2. **Identify slow interactions** — open DevTools → Performance panel → record while interacting; look for long tasks triggered by clicks/keystrokes
3. **Test on mid-range Android** — INP issues often only surface on slower hardware; use a real device or DevTools CPU throttling (4×–6× slowdown)
