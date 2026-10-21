---
instruction_id: state-complexity-as-impact-surface-and-risk
title: State complexity as impact surface and risk
summary: "The cost of an option is written as the surface it touches plus the risk it carries, never as a duration."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: An option or approach is compared and its cost has to be written down.
conditions_does_not_apply_when: "A duration was measured and is reported as a measurement, not as a prediction."
artifact_contract_output_type: option-comparison
artifact_contract_required_data:
  - the impact surface
  - the risk it carries
artifact_contract_verified_by: the comparison states impact surface and risk and no time estimate
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-advisor-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-advisor-researcher.compact.md
status: active
revision: 1
---

# State complexity as impact surface and risk
Complexity = impact surface + risk (e.g., "3 files, new dep -- Risk: memory, scroll state"). NEVER time estimates.
Do NOT use time estimates in the Complexity column
