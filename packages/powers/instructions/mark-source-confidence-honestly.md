---
instruction_id: mark-source-confidence-honestly
title: Mark the source confidence honestly
summary: "A finding carries the confidence of the source behind it: official sources, community consensus, or a single source."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A research finding is recorded.
conditions_does_not_apply_when: "The finding is a decision of the project, not a claim about a source."
artifact_contract_output_type: source-confidence
artifact_contract_required_data:
  - the source
  - the confidence level
  - the reason for it
artifact_contract_verified_by: every finding names its source and the confidence level it was read at
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/SUMMARY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Mark the source confidence honestly
Sources: Mark confidence levels honestly
HIGH = verified with official sources
MEDIUM = community consensus, multiple sources agree
LOW = single source or inference
