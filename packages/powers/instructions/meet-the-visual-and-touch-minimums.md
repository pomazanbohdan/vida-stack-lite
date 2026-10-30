---
instruction_id: meet-the-visual-and-touch-minimums
title: Meet the visual and touch minimums
summary: "Contrast, text scaling, flashing and hit areas stay inside the stated minimums."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A visual interface is built or reviewed.
conditions_does_not_apply_when: The work produces no visual surface.
artifact_contract_output_type: visual-threshold-report
artifact_contract_required_data:
  - the measured contrast ratios
  - the text scaling result
  - the hit-area sizes
artifact_contract_verified_by: every measured value is inside the stated minimum
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

# Meet the visual and touch minimums
Text contrast ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, 18px+)
UI components contrast ≥ 3:1 against background
Text resizable to 200% without breaking layout
No content that flashes more than 3 times per second
Touch targets ≥ 44x44px on mobile
