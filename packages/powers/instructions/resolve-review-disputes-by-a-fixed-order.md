---
instruction_id: resolve-review-disputes-by-a-fixed-order
title: Resolve review disputes by a fixed order
summary: "Settle a review disagreement with technical facts first, then style guides, then design principles."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review dispute has to be settled between the reviewer and the author.
conditions_does_not_apply_when: The finding is agreed and only needs fixing.
artifact_contract_output_type: dispute-resolution
artifact_contract_required_data:
  - the disputed point
  - the level of the hierarchy it is settled at
  - the grounds
artifact_contract_verified_by: the resolution names the hierarchy level that decided it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 1
---

# Resolve review disputes by a fixed order

When resolving review disputes, apply this hierarchy:

1. **Technical facts and data** override opinions and preferences
2. **Style guides** are the absolute authority on style matters
3. **Software design** must be evaluated on engineering principles, not personal preference
4. **Codebase consistency** is acceptable if it doesn't degrade overall health
