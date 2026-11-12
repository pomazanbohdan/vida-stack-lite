---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-refactoring-ui-skill-md-defb278c-c02"
title: "wondelai-skills: skills/refactoring-ui/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/refactoring-ui/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/refactoring-ui/SKILL.md\"}"
atom_ids:
  - refactoring-ui-score
  - refactoring-ui-seven-principles
  - refactoring-ui-spacing
  - refactoring-ui-typography
atom_count: 4
atoms: "[{\"atom_id\":\"refactoring-ui-score\",\"file_sha256\":\"8e84c13fcc8c3765322b9ba66e391da79e50b97f0d2bc9a59db206910e7c6d6c\",\"content_sha256\":\"c518b458b6cefd664c2d2fc05767ea7a58b5a2b6cc3818c9965fa3ce17953a85\",\"file_bytes\":1330,\"body_bytes\":269},{\"atom_id\":\"refactoring-ui-seven-principles\",\"file_sha256\":\"d671abb09245d9e5ec2e366ac0ab3699242da574583508d8105d25cbaac539a9\",\"content_sha256\":\"49632c7cf12608e7ba68ca93cf9bee45ca9d92fcf111db97e28618530412d444\",\"file_bytes\":1165,\"body_bytes\":112},{\"atom_id\":\"refactoring-ui-spacing\",\"file_sha256\":\"df2233a721a8f6424e141a24e182e19b50e60898fcf6a298402f05839b2dbcb9\",\"content_sha256\":\"0cd3ad72315008541e7e30ab422369a0cde20b08e2f1a4bbed1ef6f90a1579b3\",\"file_bytes\":1377,\"body_bytes\":256},{\"atom_id\":\"refactoring-ui-typography\",\"file_sha256\":\"d9d45937459d189edf91662a67f3ad73910afe5078000d7dbbe397589fed58f4\",\"content_sha256\":\"3841c93da7685403356613afb8cc67f4df9bfb76f6dfb06ef1b711a32429686a\",\"file_bytes\":1309,\"body_bytes\":233}]"
carrier_sha256: b91f87382c957fa6671d0a8e459f8b32f1e4827e84104d5ace2494bdbb7e919a
carrier_bytes: 5608
revision: 1
status: active
---
<!-- vpmodule:atom:begin refactoring-ui-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-score
title: Score the interface against the eight rows
summary: Score satisfied diagnostic rows out of eight and report the score and rows to fix.
capability_tags:
  - design-user-interface
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a visual interface.
conditions_does_not_apply_when: A narrow functional review that does not assess visuals.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
artifact_contract_verified_by: The report states the score and the diagnostic rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the interface against the eight rows

Score = round(satisfied diagnostic rows / 8 * 10). Bands: 10 means all eight pass; 9 means one gap; 6-8 means two or three gaps; <=5 means four or more gaps. Always state current score and diagnostic rows to fix for 10/10.
<!-- vpmodule:atom:end refactoring-ui-score -->
<!-- vpmodule:atom:begin refactoring-ui-seven-principles -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-seven-principles
title: Apply the seven visual principles
summary: "Use hierarchy, spacing, typography, color, depth, imagery and layout as professional interface guidance."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Building or reviewing a professional interface.
conditions_does_not_apply_when: A non-visual artifact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the seven principles as a coherent system.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L24-L211"
status: active
revision: 1
---

# Apply the seven visual principles

Use the seven principles as guidance for building professional interfaces.
<!-- vpmodule:atom:end refactoring-ui-seven-principles -->
<!-- vpmodule:atom:begin refactoring-ui-spacing -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-spacing
title: Use a constrained spacing scale
summary: "Use 4, 8, 16, 24, 32, 48 and 64 px, start with generous whitespace, group related elements, and constrain text and form widths."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Setting spacing, margins or content widths."
conditions_does_not_apply_when: A platform-fixed layout with no spacing decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Spacing follows the scale, groups are visibly related, and text and forms use readable widths."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L55-L79"
status: active
revision: 1
---

# Use a constrained spacing scale

Use the constrained spacing scale 4, 8, 16, 24, 32, 48, 64 px. Start with too much whitespace and remove it; make gaps between groups larger than within groups; constrain text to 45-75 characters and forms to 300-500 px.
<!-- vpmodule:atom:end refactoring-ui-spacing -->
<!-- vpmodule:atom:begin refactoring-ui-typography -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-typography
title: Use a modular type scale
summary: "Use the 12-36 px scale, heading and body line-heights, at most two families, and avoid body weights below 400."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Setting type sizes, line-heights or font families."
conditions_does_not_apply_when: A brand-mandated type system that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Type sizes and line-heights follow the scale and remain readable.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L80-L104"
status: active
revision: 1
---

# Use a modular type scale

Use the modular type scale 12, 14, 16, 18, 20, 24, 30, 36 px; headings line-height 1.0-1.25 and body 1.5-1.75; use at most two font families. Avoid body weights below 400 and reserve 600-700 for emphasis.
<!-- vpmodule:atom:end refactoring-ui-typography -->