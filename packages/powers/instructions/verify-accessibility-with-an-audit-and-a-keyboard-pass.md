---
instruction_id: verify-accessibility-with-an-audit-and-a-keyboard-pass
title: Verify accessibility with an audit and a keyboard pass
summary: "Accessibility is checked with an automated audit, with the browser's own accessibility view and with a screen reader, not by reading the code."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: An interface is about to be called accessible or is about to ship.
conditions_does_not_apply_when: The change touches no user-visible surface.
artifact_contract_output_type: accessibility-verification-record
artifact_contract_required_data:
  - the automated audit result
  - the accessibility tree inspection
  - the screen reader pass
artifact_contract_verified_by: "the audit, the tree and the screen reader pass have all been run against the current build"
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
  - design-ux
---

# Verify accessibility with an audit and a keyboard pass
Quick reference for WCAG 2.1 AA compliance.
# Automated audit
npx axe-core          # Programmatic accessibility testing
npx pa11y             # CLI accessibility checker
# In browser
# Chrome DevTools → Lighthouse → Accessibility
# Chrome DevTools → Elements → Accessibility tree
# Screen reader testing
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (free) or JAWS
# Linux: Orca
