---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-simplicity
title: Conquer complexity by subtraction
summary: "Treat simplicity as complexity conquered, keep subtracting until one more removal would break the purpose, measure steps-to-value, prefer one good default over a setting, and never hide necessary controls or costs."
capability_tags:
  - review-product-design
pattern_tags:
  - subtractive-simplicity
conditions_applies_when: Auditing product or screen complexity.
conditions_does_not_apply_when: Simplifying a technical implementation without changing the product surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names what was removed and the steps-to-value measurement.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L24-L53"
status: active
revision: 1
---

# Conquer complexity by subtraction

Treat simplicity as conquered complexity, not the absence of features: keep subtracting until removing one more thing would break the product's purpose. In a feature audit, count steps to core value and cut anything off the main path, using the source's benchmark of first value in 3 steps rather than 9; in a UI critique, remove elements until the screen states one intent and use one primary button per screen; in a settings review, replace options with opinionated defaults such as always-on auto-save with no toggle. Prefer one good default over exposing a preference, treat every preference as a decision the team failed to make, and redesign anything that must be explained because instructions are apologies. Simplify by solving complexity for the user, never by burying necessary controls or costs such as pricing, privacy, or cancellation where they cannot be found.
