---
instruction_id: keep-every-competing-acceptance-variant-instead-of-merging-them
title: Keep every competing acceptance variant instead of merging them
summary: "Two sources that define the same requirement differently produce two variants, both written out, and the choice is the owner's."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - preserved-disagreement
conditions_applies_when: Two documents define the same requirement with different acceptance criteria.
conditions_does_not_apply_when: The documents state the same acceptance criteria.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the variants
  - the requirement they belong to
artifact_contract_verified_by: both variants are present and neither was merged away
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Keep every competing acceptance variant instead of merging them
Same requirement, divergent acceptance criteria across PRDs: Do NOT pick one. Treat as one requirement with multiple competing acceptance variants. Write all variants to the `competing-variants` bucket for user resolution.
Impact: Synthesis cannot pick without losing intent
