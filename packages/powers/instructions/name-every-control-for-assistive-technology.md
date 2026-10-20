---
instruction_id: name-every-control-for-assistive-technology
title: Name every control for assistive technology
summary: "Give every control an accessible name and the right role, so that assistive technology announces what the control is."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "An interface renders images, form fields, buttons, links or custom widgets."
conditions_does_not_apply_when: The surface renders no interactive or descriptive element.
artifact_contract_output_type: accessible-name-review
artifact_contract_required_data:
  - the element
  - its accessible name
  - its role
artifact_contract_verified_by: every control has a name that says what it does and an element that matches its behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/accessibility-checklist.md
status: active
revision: 1
---

# Name every control for assistive technology
All images have `alt` text (or `alt=""` for decorative images)
All form inputs have associated labels (`<label>` or `aria-label`)
Buttons and links have descriptive text (not "Click here")
Icon-only buttons have `aria-label`
Use `<button>` for actions
Use `<a>` for navigation
NEVER use div/span as buttons
`div` as button | Not focusable, no keyboard support | Use `<button>`
Missing `alt` text | Images invisible to screen readers | Add descriptive `alt`
Custom dropdown with no ARIA | Unusable by keyboard/screen reader | Use native `<select>` or proper ARIA listbox
Empty links/buttons | "Link" announced with no description | Add text or `aria-label`
