---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ux-heuristics-skill-md-235d8e0d-c01"
title: "wondelai-skills: skills/ux-heuristics/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/ux-heuristics/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ux-heuristics/SKILL.md\"}"
atom_ids:
  - ux-heuristics-clicks
  - ux-heuristics-common-mistakes
  - ux-heuristics-conflicts
  - ux-heuristics-consistency
  - ux-heuristics-cut-words
  - ux-heuristics-dark-patterns
  - ux-heuristics-diagnostic
  - ux-heuristics-dont-make-me-think
atom_count: 8
atoms: "[{\"atom_id\":\"ux-heuristics-clicks\",\"file_sha256\":\"3aa2798b545424fefd9a5d40a0ee660728c9066bbc2a978fbe61da6e4ef09fae\",\"content_sha256\":\"a969e5db278fa0923ab7d2ec83db286b78b8ca6c2849e675f516dc24b4c9aba7\",\"file_bytes\":1223,\"body_bytes\":167},{\"atom_id\":\"ux-heuristics-common-mistakes\",\"file_sha256\":\"4cefdd83978afd1645b3cf9bf156cd9380ae48dee4e498394b310b1fbac3ff32\",\"content_sha256\":\"456097116b2f7041c21be692bf6a50f17f241ad7ea41c1235bd3d78375378f0e\",\"file_bytes\":1729,\"body_bytes\":481},{\"atom_id\":\"ux-heuristics-conflicts\",\"file_sha256\":\"155594473da3482fbbbc568550b1eca7bae77311682f48b8da982cc4666c3d52\",\"content_sha256\":\"028c88193c067cfb62a9af4e10fa3a9555774bea9199a71c8821afccea3edb98\",\"file_bytes\":1299,\"body_bytes\":204},{\"atom_id\":\"ux-heuristics-consistency\",\"file_sha256\":\"8f4f20cec1caab2d4020e9c1ecd1ddd1590229c9f0581d64200f7f966fbf8d60\",\"content_sha256\":\"2b50b42a2cb5c1e83101bd9a93dd85878c3bca2b285462607f08005286b48510\",\"file_bytes\":1265,\"body_bytes\":171},{\"atom_id\":\"ux-heuristics-cut-words\",\"file_sha256\":\"0cb971b0f1c0a34b0018ec9b7ab49bdef6afd80fd71fbae7b0bcd681377d46de\",\"content_sha256\":\"30f6168a052d2ba6a08e8db0916d776855cf0d0e5dd3d7cbcb42eec1906bf89a\",\"file_bytes\":1203,\"body_bytes\":157},{\"atom_id\":\"ux-heuristics-dark-patterns\",\"file_sha256\":\"464260307585bdcc24a222fee709353cdce81d0b8eb6ff0b992184a71e184579\",\"content_sha256\":\"10b1a58fc00ed9165e6218a6b8bf196e1ad14b8383391d997b9071b2ab076e5a\",\"file_bytes\":1225,\"body_bytes\":177},{\"atom_id\":\"ux-heuristics-diagnostic\",\"file_sha256\":\"7227c4afedcdcfa32f900343f3817414aa42b9d0671269079256f60008486c0f\",\"content_sha256\":\"bce96527be28ca8129ff907427ea894a1f5d422048ae84125554209ccf1185be\",\"file_bytes\":1275,\"body_bytes\":196},{\"atom_id\":\"ux-heuristics-dont-make-me-think\",\"file_sha256\":\"25618cd7969b563a47afdba5985eef0eab05d14f9db243e50a5d2b9e624649da\",\"content_sha256\":\"c9823c3813a68c3405b6565b264268eb0e2cc4e3ac954a4c1a4bea527f4a72b5\",\"file_bytes\":1226,\"body_bytes\":163}]"
carrier_sha256: f7edad3bb645d8e835c2a518d79e02c27ca036ac6753b5f647c10b1257b0fa9c
carrier_bytes: 11314
revision: 1
status: active
---
<!-- vpmodule:atom:begin ux-heuristics-clicks -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-clicks
title: Do not optimize for a fixed click limit
summary: "Accept additional clicks when each is painless, obvious and builds confidence."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Evaluating navigation depth or flow length.
conditions_does_not_apply_when: A flow where extra steps add no clarity or confidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each click is obvious and confidence-building rather than merely counted.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L55-L80"
status: active
revision: 1
---

# Do not optimize for a fixed click limit

Do not optimize for a fixed three-click limit; clicks are acceptable when each is painless, obvious, and builds confidence.
<!-- vpmodule:atom:end ux-heuristics-clicks -->
<!-- vpmodule:atom:begin ux-heuristics-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-common-mistakes
title: Avoid common usability mistakes
summary: "Fix unlabeled icons, excessive choices, poor orientation, late validation, unclear optional fields, dense text, vague labels, missing loading, small touch targets, hover-only information, missing undo, unexplained errors, low contrast, shifting navigation and broken history."
capability_tags:
  - audit-accessibility
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing an interface for the listed usability mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the concrete correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L167-L188"
status: active
revision: 1
---

# Avoid common usability mistakes

Remedy the listed mistakes: label icons; reduce choices (about 7 +/- 2); orient users; validate on blur with specific messages; mark optional fields; break up dense text; use plain labels; show loading; use touch targets at least 44x44 px; expose hover-only information to mobile/keyboard users; provide undo for non-destructive actions; explain errors; meet WCAG AA 4.5:1 contrast; keep navigation position consistent; preserve browser history.
<!-- vpmodule:atom:end ux-heuristics-common-mistakes -->
<!-- vpmodule:atom:begin ux-heuristics-conflicts -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-conflicts
title: Resolve heuristic conflicts deliberately
summary: "Use progressive disclosure, consistent contextual patterns, undo over confirmation and visible primary actions to resolve tensions."
capability_tags:
  - design-user-interface
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Two heuristics pull the design in different directions.
conditions_does_not_apply_when: A design with no heuristic conflict.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The chosen resolution states which heuristic yields and why.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L204-L213"
status: active
revision: 1
---

# Resolve heuristic conflicts deliberately

Resolve tensions with progressive disclosure; consistent/contextual patterns; undo over confirmation where suitable; visible primary, hidden secondary actions.
<!-- vpmodule:atom:end ux-heuristics-conflicts -->
<!-- vpmodule:atom:begin ux-heuristics-consistency -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-consistency
title: Keep language and behavior consistent
summary: "Use the same words, styles and behaviors internally and with the platform, with one term per concept."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing interface components or terminology.
conditions_does_not_apply_when: A deliberate platform-specific convention that users expect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The same concept uses one term and the same behavior across the interface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L128-L130"
status: active
revision: 1
---

# Keep language and behavior consistent

Use the same words, styles, and behaviors consistently; maintain both internal and platform consistency and one term per concept.
<!-- vpmodule:atom:end ux-heuristics-consistency -->
<!-- vpmodule:atom:begin ux-heuristics-cut-words -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-cut-words
title: "Cut half the words, then half again"
summary: "Remove unnecessary words so useful content is prominent and users' time is respected."
capability_tags:
  - design-user-interface
pattern_tags:
  - technical-writing
conditions_applies_when: Editing interface or page copy.
conditions_does_not_apply_when: Legal or safety text whose wording cannot be shortened.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The remaining copy is shorter and the useful content is more prominent.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L81-L104"
status: active
revision: 1
---

# Cut half the words, then half again

Remove half the words on a page, then half of what remains, to make useful content prominent and respect users' time.
<!-- vpmodule:atom:end ux-heuristics-cut-words -->
<!-- vpmodule:atom:begin ux-heuristics-dark-patterns -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-dark-patterns
title: Recognize dark patterns
summary: "Identify forced continuity, roach motels, confirmshaming and hidden costs as deliberate manipulation."
capability_tags:
  - audit-accessibility
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a flow for manipulative design.
conditions_does_not_apply_when: A legitimate friction that protects the user.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the dark pattern and the user harm it causes.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L214-L219"
status: active
revision: 1
---

# Recognize dark patterns

Recognize forced continuity, roach motel, confirmshaming, and hidden costs as dark patterns that deliberately violate heuristics to manipulate users.
<!-- vpmodule:atom:end ux-heuristics-dark-patterns -->
<!-- vpmodule:atom:begin ux-heuristics-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-diagnostic
title: Run the usability diagnostic
summary: "Audit orientation, actions, navigation, feedback, errors, reversibility, hover dependence, labels and cognitive friction."
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
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L189-L203"
status: active
revision: 1
---

# Run the usability diagnostic

Use the following questions to audit interface orientation, actions, navigation, feedback, errors, reversibility, hover dependence, labels, and cognitive friction.
<!-- vpmodule:atom:end ux-heuristics-diagnostic -->
<!-- vpmodule:atom:begin ux-heuristics-dont-make-me-think -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-dont-make-me-think
title: Make the interface self-evident
summary: "Design for scanning and satisficing, and reduce unnecessary thought and cognitive load."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing or reviewing a user interface.
conditions_does_not_apply_when: A purely decorative change with no task effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface makes the next action evident without requiring interpretation.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L14-L17"
status: active
revision: 1
---

# Make the interface self-evident

Make pages self-evident and design for scanning, satisficing, and muddling through; reduce needless thought and cognitive load.
<!-- vpmodule:atom:end ux-heuristics-dont-make-me-think -->