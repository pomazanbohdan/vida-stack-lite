---
instruction_id: say-what-breaks-first-not-the-theoretical-limit
title: "Say what breaks first, not the theoretical limit"
summary: "A scaling statement names the first bottleneck and the next one, not the theoretical maximum."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A scaling section is written.
conditions_does_not_apply_when: The scale of the product is already known and fixed.
artifact_contract_output_type: scaling-statement
artifact_contract_required_data:
  - the first bottleneck and how it breaks
  - the next bottleneck
artifact_contract_verified_by: the statement names what breaks first and leaves out the theoretical limit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/ARCHITECTURE.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Say what breaks first, not the theoretical limit
Be realistic — most projects don't need to scale to millions
Focus on "what breaks first" not theoretical limits
1. **First bottleneck:** [what breaks first, how to fix]
2. **Second bottleneck:** [what breaks next, how to fix]
