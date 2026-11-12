---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-refactoring-ui-skill-md-defb278c-c01"
title: "wondelai-skills: skills/refactoring-ui/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/refactoring-ui/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/refactoring-ui/SKILL.md\"}"
atom_ids:
  - refactoring-ui-color-contrast
  - refactoring-ui-common-mistakes
  - refactoring-ui-depth
  - refactoring-ui-diagnostic
  - refactoring-ui-grayscale-first
  - refactoring-ui-hierarchy
  - refactoring-ui-images-and-icons
  - refactoring-ui-layout
atom_count: 8
atoms: "[{\"atom_id\":\"refactoring-ui-color-contrast\",\"file_sha256\":\"f485a515359d679a1c15de50237c745557da546eb6f605f46806ef3881db876e\",\"content_sha256\":\"a56afc93e40c3eae429f8c69505b8a259494102cf050ade8b3d1219c4d3d17ea\",\"file_bytes\":1319,\"body_bytes\":240},{\"atom_id\":\"refactoring-ui-common-mistakes\",\"file_sha256\":\"d6c63ecfab688f865599d139293c25eda76a4ba5434c9b6a8d90c61d084f00ad\",\"content_sha256\":\"32f675657045cd4331391df37f4baa6e37727eab1ccbf0f69eb5b28824eae4ab\",\"file_bytes\":1374,\"body_bytes\":211},{\"atom_id\":\"refactoring-ui-depth\",\"file_sha256\":\"fea31a6644251f0860f5e61bfb4d93d59bc4196811ed3c91fd09d7e9d3968c83\",\"content_sha256\":\"2d05f45a786840c84302ec3043d00609fd5fc2a56dcdd3971f7bb2ff42e5bf18\",\"file_bytes\":1250,\"body_bytes\":174},{\"atom_id\":\"refactoring-ui-diagnostic\",\"file_sha256\":\"2f038d7328d22cf16fa1f9f6cda7aa6dac73a1eac11bbb3a9f5c1aa287fb83a3\",\"content_sha256\":\"bdfbd583d2e496248ed8f33ca205c3067d26802c9c8d9e086d4ee4cad96eb859\",\"file_bytes\":1250,\"body_bytes\":168},{\"atom_id\":\"refactoring-ui-grayscale-first\",\"file_sha256\":\"aed49c09dbaf4664847be1e967f40fbfdb5406d484663dd2ab2e8e6e5294dcab\",\"content_sha256\":\"0f66a084dfc8823774b627c28b22857c143ed750bb9a0c4202d87fcb7f309daa\",\"file_bytes\":1220,\"body_bytes\":155},{\"atom_id\":\"refactoring-ui-hierarchy\",\"file_sha256\":\"3c8134f5080b0b42e5e4f4ca59f9998fb3db8ec8a86e4252376c7ba9d991fb55\",\"content_sha256\":\"b4369968399095f8957a3b68e4d944d8ac4f4ebce6e287497d7615274e02b1b1\",\"file_bytes\":1385,\"body_bytes\":316},{\"atom_id\":\"refactoring-ui-images-and-icons\",\"file_sha256\":\"289d0fb285d643d23ba183ff60926f262f25a4c8df3d038cdd520cfbd01f9cbd\",\"content_sha256\":\"30dea51637d6ab8af55983c8a53197ea478b622d2a85a68897802c21ab4153e4\",\"file_bytes\":1335,\"body_bytes\":193},{\"atom_id\":\"refactoring-ui-layout\",\"file_sha256\":\"94c8bba1a282f3ee71ac4f27f73e22621e82ff47cfab7401e7fce0fdeebac2a9\",\"content_sha256\":\"4bcf7af0927cb252b9ae0820effa6bace29624c30b9b501edca11243d803d8ce\",\"file_bytes\":1269,\"body_bytes\":192}]"
carrier_sha256: a8bdae11e02adcd413c4ea04db374eea59714480a09b4443d8e0158713f579a2
carrier_bytes: 11285
revision: 1
status: active
---
<!-- vpmodule:atom:begin refactoring-ui-color-contrast -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-color-contrast
title: "Build a systematic, accessible palette"
summary: "Use 5-9 shades per color, tint grays, design in grayscale first and meet 4.5:1 body and 3:1 large-text contrast."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: Choosing colors or checking contrast.
conditions_does_not_apply_when: A palette fixed by an external brand contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The palette is systematic and meets the stated contrast minima.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L105-L131"
status: active
revision: 1
---

# Build a systematic, accessible palette

Build a systematic palette with 5-9 shades per color, near-white to near-black; tint grays and design in grayscale first. Meet contrast minima of 4.5:1 for body text and 3:1 for large text (18px+).
<!-- vpmodule:atom:end refactoring-ui-color-contrast -->
<!-- vpmodule:atom:begin refactoring-ui-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-common-mistakes
title: Fix common visual-interface mistakes
summary: "Fix weak whitespace and widths, poor depth and hierarchy, unreadable line-height or contrast, ungrouped spacing, excessive palette, low action contrast and inconsistent scales."
capability_tags:
  - design-user-interface
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing an interface for the listed visual mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the visual mistake and the concrete correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L212-L224"
status: active
revision: 1
---

# Fix common visual-interface mistakes

Fix listed issues with whitespace/width constraints, depth/hierarchy, readable line-height/contrast, grouped spacing, limited palette, action contrast, consistent scales.
<!-- vpmodule:atom:end refactoring-ui-common-mistakes -->
<!-- vpmodule:atom:begin refactoring-ui-depth -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-depth
title: Use a consistent shadow scale
summary: "Use consistent elevation shadows, combine tight and soft shadows, avoid opaque-gray overuse, and use other depth cues."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing elevation or card depth.
conditions_does_not_apply_when: A flat design with no elevation decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Elevation uses a consistent shadow scale and does not rely on heavy gray shadows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L132-L159"
status: active
revision: 1
---

# Use a consistent shadow scale

Use consistent shadow scale for elevation; combine tight/soft shadows where useful, avoid overuse/opaque-gray shadows, use other depth cues.
<!-- vpmodule:atom:end refactoring-ui-depth -->
<!-- vpmodule:atom:begin refactoring-ui-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-diagnostic
title: Run the visual-interface diagnostic
summary: "Audit hierarchy in blur or grayscale, whitespace, label emphasis, spacing scale, text width, contrast and shadows."
capability_tags:
  - audit-accessibility
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of an interface.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L225-L239"
status: active
revision: 1
---

# Run the visual-interface diagnostic

Audit hierarchy in blur/grayscale, whitespace, label emphasis, spacing scale, text width, contrast, shadows; apply listed fixes.
<!-- vpmodule:atom:end refactoring-ui-diagnostic -->
<!-- vpmodule:atom:begin refactoring-ui-grayscale-first -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-grayscale-first
title: Design hierarchy in grayscale first
summary: "Establish hierarchy with spacing, contrast and typography before adding color."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing a new interface or reviewing visual hierarchy.
conditions_does_not_apply_when: A purely decorative treatment with no hierarchy decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The layout has a clear hierarchy without relying on color.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L14-L19"
status: active
revision: 1
---

# Design hierarchy in grayscale first

Design in grayscale first and add color last so hierarchy is established through spacing, contrast, and typography.
<!-- vpmodule:atom:end refactoring-ui-grayscale-first -->
<!-- vpmodule:atom:begin refactoring-ui-hierarchy -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-hierarchy
title: "Build hierarchy with size, weight and color"
summary: "Combine hierarchy levers selectively, de-emphasize labels and metadata, and never hide unfavorable terms."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing visual hierarchy.
conditions_does_not_apply_when: A single-element screen with no hierarchy choice.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Primary content is clearly dominant and no important term is hidden.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L28-L54"
status: active
revision: 1
---

# Build hierarchy with size, weight and color

Create hierarchy with size, weight, and color; combine levers selectively (primary text is large OR bold OR dark, reserving all three for the single most important element); de-emphasize labels and metadata. Never use hierarchy to hide pricing, terms, or cancellation.
<!-- vpmodule:atom:end refactoring-ui-hierarchy -->
<!-- vpmodule:atom:begin refactoring-ui-images-and-icons -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-images-and-icons
title: Handle images and icons deliberately
summary: "Size icons consistently, preserve image proportions with deliberate crops, overlay text for readability, and give empty states a clear action."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Placing icons, images or empty states."
conditions_does_not_apply_when: A text-only interface with no imagery.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Icons and images are consistently sized, legible and proportioned, and empty states offer an action."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L160-L184"
status: active
revision: 1
---

# Handle images and icons deliberately

Size icons consistently, preserve image proportions with deliberate crop, overlay text for readability, give empty states illustration and clear action.
<!-- vpmodule:atom:end refactoring-ui-images-and-icons -->
<!-- vpmodule:atom:begin refactoring-ui-layout -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-layout
title: Compose with deliberate alignment
summary: "Left-align by default, center only short or single-action content, and use alignment, overlap, emphasis and constrained widths."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Laying out a page or section.
conditions_does_not_apply_when: A layout fixed by a platform template.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Alignment supports scanning and centered text is reserved for short content.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L185-L211"
status: active
revision: 1
---

# Compose with deliberate alignment

Left-align by default; center only short headlines, heroes, single-action CTAs, empty states; use alignment, overlap, varied emphasis, constrained widths.
<!-- vpmodule:atom:end refactoring-ui-layout -->