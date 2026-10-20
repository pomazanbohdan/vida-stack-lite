---
instruction_id: derive-a-design-contract-from-references
title: Derive a design contract from references
summary: "Study real references, record the decisions they show, write a short design contract, then rebuild in the product's own language."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: The product needs a distinct visual direction for a new or reworked screen.
conditions_does_not_apply_when: "The screen already follows the product's existing design system and needs no new direction."
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the references studied
  - the decisions recorded
  - the contract
  - the assumptions when no reference was available
artifact_contract_verified_by: "the contract names the screen's job, primary action, states, responsive rules and rejected patterns"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
---

# Derive a design contract from references

When the product needs a distinct visual direction, collect evidence before choosing a layout:

1. Search a trusted reference catalogue or use references supplied by the product team.
2. Study two or three relevant screens. Record decisions about hierarchy, density, navigation, controls, responsive behavior, and interaction states.
3. Turn those decisions into a short design contract before implementation. Name the screen's job, primary action, required states, responsive rules, and patterns to reject.
4. Rebuild the useful structure in the product's own components, tokens, content, and visual language. Never copy another product's branding, proprietary text, imagery, or exact layout.

Use references as evidence, not as templates. If references are unavailable, document the assumptions and verify the result against the product's existing design system.
