---
instruction_id: make-every-control-keyboard-operable
title: Make every control keyboard-operable
summary: "Every interactive element must be reachable and operable from the keyboard, in a visible and logical focus order."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: An interface with interactive elements is built or reviewed.
conditions_does_not_apply_when: The surface has no interactive element.
artifact_contract_output_type: keyboard-operability-checklist
artifact_contract_required_data:
  - the interactive elements
  - how each one is reached and operated
  - the focus order
artifact_contract_verified_by: "every interactive element is reachable and operable by keyboard alone, with the focus always visible"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/accessibility-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Make every control keyboard-operable
All interactive elements focusable via Tab key
Focus order follows visual/logical order
Focus is visible (outline/ring on focused elements)
Custom widgets have keyboard support (Enter to activate, Escape to close)
No keyboard traps (user can always Tab away from a component)
Skip-to-content link at top of page - visible (at least) on keyboard focus
Modals trap focus while open, return focus on close
Removing focus outlines | Users can't see where they are | Style outlines, don't remove them
`tabindex` > 0 | Breaks natural tab order | Use `tabindex="0"` or `-1` only
