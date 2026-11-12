---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-design-everyday-things-skill-md-090d14d4-c03"
title: "wondelai-skills: skills/design-everyday-things/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/design-everyday-things/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/design-everyday-things/SKILL.md\"}"
atom_ids:
  - design-everyday-things-signifiers
  - design-everyday-things-slips-and-mistakes
  - design-everyday-things-two-gulfs
atom_count: 3
atoms: "[{\"atom_id\":\"design-everyday-things-signifiers\",\"file_sha256\":\"af8dfad7873c215e24059e72dd89034e7be9f813b3d2fa5975ba80298edcb106\",\"content_sha256\":\"c3928fa3a15b3a91b5a81deb4cf273003d2de92ad6a9bbfc4c60f64ea3f31e13\",\"file_bytes\":1223,\"body_bytes\":162},{\"atom_id\":\"design-everyday-things-slips-and-mistakes\",\"file_sha256\":\"237db0d71c9269e4add9abd83cbbde99b883fb996d5882b75e9c527fa23ea13d\",\"content_sha256\":\"bc76d9c2c086fb83b11511e4ff3c70653d587dcda5ed5b628f3e1585bd189f8f\",\"file_bytes\":1323,\"body_bytes\":214},{\"atom_id\":\"design-everyday-things-two-gulfs\",\"file_sha256\":\"f06e4efae4c490ea600cba6e8712be15bcad7163d17e2a4be1a2449b3c0ddf97\",\"content_sha256\":\"029c86f54f8db925778e5a152043862c991e909c0b68365a7aec598422039aa6\",\"file_bytes\":1300,\"body_bytes\":212}]"
carrier_sha256: edc410b9b8f46b79641c81a92e746f6aca869742e75c91426e99899c87d05bef
carrier_bytes: 4231
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-everyday-things-signifiers -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-signifiers
title: Use signifiers to show where to act
summary: Use affordances for what can be done and signifiers for where and how to do it.
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing controls or instructions.
conditions_does_not_apply_when: A control whose operation is fully evident from its form.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Signifiers make the location and method of action clear.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L88-L109"
status: active
revision: 1
---

# Use signifiers to show where to act

Signifiers communicate where an action should take place; affordances indicate what can be done, signifiers where and how.
<!-- vpmodule:atom:end design-everyday-things-signifiers -->
<!-- vpmodule:atom:begin design-everyday-things-slips-and-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-slips-and-mistakes
title: Distinguish slips from mistakes
summary: "Separate right-intent wrong-action slips from wrong-intent mistakes, and address each with the appropriate design response."
capability_tags:
  - design-user-interface
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing error prevention or recovery.
conditions_does_not_apply_when: An error with no identifiable user intent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The response matches the error type rather than treating all errors alike.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L201-L219"
status: active
revision: 1
---

# Distinguish slips from mistakes

Distinguish slips (right intent/wrong action) from mistakes (wrong intent); address with separated destructive actions, reminders, visible modes, prompts, context, better models.
<!-- vpmodule:atom:end design-everyday-things-slips-and-mistakes -->
<!-- vpmodule:atom:begin design-everyday-things-two-gulfs -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-two-gulfs
title: Bridge execution and evaluation
summary: "Use signifiers, mappings, constraints and familiar models for execution, and feedback, state and meaningful errors for evaluation."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing or reviewing a user interaction.
conditions_does_not_apply_when: A non-interactive artifact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design narrows both the execution and evaluation gulfs.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L22-L35"
status: active
revision: 1
---

# Bridge execution and evaluation

Bridge execution with signifiers, mappings, constraints, familiar models; bridge evaluation with immediate feedback, state, meaningful errors, progress; keep both gulfs narrow.
<!-- vpmodule:atom:end design-everyday-things-two-gulfs -->