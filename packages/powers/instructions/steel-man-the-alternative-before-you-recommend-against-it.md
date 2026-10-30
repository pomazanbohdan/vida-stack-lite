---
instruction_id: steel-man-the-alternative-before-you-recommend-against-it
title: Steel-man the alternative before you recommend against it
summary: The strongest case for the alternative is built and shown next to the recommendation; a competitive alternative becomes a decision for the owner.
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: An alternative is about to be rejected in a recommendation.
conditions_does_not_apply_when: The decision was already locked by the owner.
artifact_contract_output_type: steel-man-comparison
artifact_contract_required_data:
  - the strongest case for the alternative
  - the honest comparison
  - the decision status
artifact_contract_verified_by: the steel-manned alternative is presented next to the recommendation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Steel-man the alternative before you recommend against it
Before recommending against an alternative technology or approach, construct its STRONGEST possible case. What would a passionate advocate say? What use cases does it serve better than your recommendation? What trade-offs favor it? Present the steel-manned alternative alongside your recommendation with an honest comparison. If the steel-manned alternative is competitive, flag the decision as `[NEEDS DECISION]` rather than making a unilateral recommendation
