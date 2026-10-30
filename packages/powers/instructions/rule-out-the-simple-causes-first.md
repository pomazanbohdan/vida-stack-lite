---
instruction_id: rule-out-the-simple-causes-first
title: Rule out the simple causes first
summary: The boring explanations are checked before a complex one is entertained; a hypothesis that needs three things to fail at once is set aside.
capability_tags:
  - debug-root-cause
pattern_tags:
  - failure-first-analysis
conditions_applies_when: "A complex interaction, a race condition or a framework-level issue is suspected."
conditions_does_not_apply_when: The cause is already identified.
artifact_contract_output_type: simple-cause-check
artifact_contract_required_data:
  - the simple explanations that were checked
  - the result of each
artifact_contract_verified_by: the simple explanations were ruled out before the complex hypothesis was taken up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Rule out the simple causes first
Before investigating complex multi-component interaction bugs, race conditions, or framework-level issues, verify the simple explanations first: typo in variable name, wrong file path, missing import, incorrect config value, stale cache, wrong environment variable. These "boring" causes account for the majority of bugs. Only escalate to complex hypotheses AFTER the simple ones are eliminated. If your current hypothesis requires 3+ things to go wrong simultaneously, step back and look for a single-point failure.
