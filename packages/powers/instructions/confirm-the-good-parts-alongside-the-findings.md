---
instruction_id: confirm-the-good-parts-alongside-the-findings
title: Confirm the good parts alongside the findings
summary: "A review says what is correct as well as what has to change, and every finding is written as what is wrong, why it matters and how to fix it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is being written.
conditions_does_not_apply_when: The review is a list of defects with nothing that works.
artifact_contract_output_type: balanced-review
artifact_contract_required_data:
  - what the review confirms as correct
  - the shape of each finding
  - what the finding has to say
artifact_contract_verified_by: the review confirmed the good parts and each finding carries the three parts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/contexts/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives general review-writing rules but does not identify an engineering, design-ux, product, business, research, or operations domain."
---

# Confirm the good parts alongside the findings
- State what is correct as well as what needs change — confirm the good parts
- Each issue should be one to three sentences: what is wrong, why it matters, and how to fix it.
