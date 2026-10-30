---
instruction_id: keep-the-dependency-tier-order-monotone
title: Keep the dependency tier order monotone
summary: "A component never depends on one of a weaker tier: the strongest tier may depend on anything, the middle tier may not depend on the weakest, and the weakest depends on nothing of the sort."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: The dependencies between tiers are being declared.
conditions_does_not_apply_when: The tiers are not ordered by strength.
artifact_contract_output_type: tier-monotone-dependency
artifact_contract_required_data:
  - the tier that declares the dependency
  - the tier it depends on
  - the rule the order follows
artifact_contract_verified_by: no component depends on a weaker tier than its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/capability-manifest.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the dependency tier order monotone
- **`requires` is tier-monotone.** A `core` capability may not require a `standard` or `full` capability. A `standard` capability may not require a `full` capability.
