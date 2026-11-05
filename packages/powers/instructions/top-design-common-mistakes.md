---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-common-mistakes
title: Avoid the 15 craft mistakes
summary: "Check the 15 recurring failures, from generic fonts and default easing to pure black, purple-blue gradients, emoji icons, text parallax and default form styles, and apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a high-craft experience for the listed failures.
conditions_does_not_apply_when: A finding already covered by a narrower instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L236-L257"
status: active
revision: 1
---

# Avoid the 15 craft mistakes

Avoid these 15 common mistakes; each fix points to the pillar that defines the rule rather than re-deriving values here: (1) Inter, Roboto, Arial, or system-ui as primary typeface fails because application fonts signal generic rather than premium — use a premium foundry or quality Google alternative (Pillar 1). (2) Uniform type scale with everything within 2x fails because there is no hierarchy or gasping moment — hit the display-to-body ratio (Pillar 1). (3) ease, ease-in, ease-out, or linear easing fails because it is mechanical and lifeless — banned; use a custom cubic-bezier (Pillar 3). (4) Animating everything simultaneously fails as visual noise with no hierarchy or narrative — stagger and sequence by importance (Pillar 3). (5) Center-aligning everything fails as safe but boring with no tension — use asymmetry, grid offsets, and bleeding elements (Pillar 2). (6) Equal spacing everywhere fails as monotony with nowhere for the eye to rest — vary density with dense sections then breathing room (Pillar 2). (7) Pure #000000/#ffffff fails as lifeless and harsh — use warm variants (Pillar 4). (8) Default browser scroll fails as mechanical and treats all content equally — use a smooth-scroll library (Pillar 5). (9) Purple-to-blue gradient hero fails as the generic AI-gradient trend — use a signature color approach specific to the project (Pillar 4). (10) No signature moment fails as competent but forgettable — design the screenshot-worthy moment first (Process step 2). (11) Any emoji in professional interfaces fails as casual/amateur craft — use custom iconography or typographic treatments. (12) Parallax on text or critical content fails through motion sickness and accessibility failures — restrict parallax to decorative background elements (Pillar 5). (13) Animations blocking interaction fails as hostile UX — keep all animation non-blocking (Pillar 3). (14) Unmodified Font Awesome icons fail as template-level design — use custom icons or heavily customize them to match the brand. (15) Default form styles fail by breaking the illusion of craft instantly — design every input, select, checkbox, and button (Pillar 7).
