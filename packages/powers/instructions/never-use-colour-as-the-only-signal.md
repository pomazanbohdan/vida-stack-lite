---
instruction_id: never-use-colour-as-the-only-signal
title: Never use colour as the only signal
summary: "Every state that is carried by colour is carried by text, an icon or another cue as well."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: "A state, a link, a required field or an error is shown with colour."
conditions_does_not_apply_when: Nothing in the surface is distinguished by colour.
artifact_contract_output_type: non-colour-signal-review
artifact_contract_required_data:
  - the state
  - the colour cue
  - the cue that survives without colour
artifact_contract_verified_by: "every colour-only state also carries a text, icon or pattern cue"
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

# Never use colour as the only signal
Color is not the only way to convey information
Links distinguish from surrounding text (not by color alone)
Required fields indicated (not by color alone)
Error state visible by more than color (icon, text, border)
Color-only states | Invisible to color-blind users | Add icons, text, or patterns
