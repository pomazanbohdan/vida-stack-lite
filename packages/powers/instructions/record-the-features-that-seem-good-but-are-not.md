---
instruction_id: record-the-features-that-seem-good-but-are-not
title: Record the features that seem good but are not
summary: A feature that looks attractive but creates problems is documented with the problem and the alternative.
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The feature landscape of a domain is written.
conditions_does_not_apply_when: No attractive but problematic feature was found.
artifact_contract_output_type: anti-feature-list
artifact_contract_required_data:
  - the feature
  - the problem it creates
  - the alternative to use
artifact_contract_verified_by: each such feature is listed with its problem and the alternative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/FEATURES.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Record the features that seem good but are not
Features that seem good but create problems.
Prevent scope creep by documenting what seems good but isn't
Include the alternative approach
