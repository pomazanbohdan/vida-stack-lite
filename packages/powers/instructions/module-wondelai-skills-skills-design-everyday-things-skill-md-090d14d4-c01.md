---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-design-everyday-things-skill-md-090d14d4-c01"
title: "wondelai-skills: skills/design-everyday-things/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/design-everyday-things/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/design-everyday-things/SKILL.md\"}"
atom_ids:
  - design-everyday-things-affordances
  - design-everyday-things-blame-design
  - design-everyday-things-common-mistakes
  - design-everyday-things-conceptual-models
  - design-everyday-things-constraints
  - design-everyday-things-design-for-use
  - design-everyday-things-diagnostic
  - design-everyday-things-discoverability
atom_count: 8
atoms: "[{\"atom_id\":\"design-everyday-things-affordances\",\"file_sha256\":\"c2789a2244c540956e2b971cabaa838358f4c32c19c7f8f92c111dc755042d51\",\"content_sha256\":\"999f6847201f246fc4c266dcbe7a768069f64664474fb4cba1c469f36b949480\",\"file_bytes\":1364,\"body_bytes\":222},{\"atom_id\":\"design-everyday-things-blame-design\",\"file_sha256\":\"344a0eb50ce0d8cc3287451a038f7d494ae0a3377feeacf9e2e79939db00455c\",\"content_sha256\":\"d0d1af678699cf6cfd332432e928d21ed4a47fcd857e5193f499246fac61a1c6\",\"file_bytes\":1153,\"body_bytes\":108},{\"atom_id\":\"design-everyday-things-common-mistakes\",\"file_sha256\":\"cf4fdd16069612aa8be2a9ec900d8dd394e8a37b2cbad6e0b34200e4eb989398\",\"content_sha256\":\"b6a5494553bf364c2cbdacdf8c49f4c9118ada72f533b8b328aca2a99d502396\",\"file_bytes\":1235,\"body_bytes\":152},{\"atom_id\":\"design-everyday-things-conceptual-models\",\"file_sha256\":\"d5252af84ba34fe65e0d48d8aa0f7b9cefd84d38ce3dc94f51a0a1b7898a8098\",\"content_sha256\":\"af32f8259d241b871c2970a4670bf340b2e94f76ad0fbd86bd0780ca2cb3a983\",\"file_bytes\":1294,\"body_bytes\":185},{\"atom_id\":\"design-everyday-things-constraints\",\"file_sha256\":\"ba717d359394650822640dacb618ec0e5a1e9fb1c623ea64597cb309ac77aa77\",\"content_sha256\":\"5884cf74db08e576cdd7e544562e8471e7dddd53fee3bfce0167208a0d6a3538\",\"file_bytes\":1334,\"body_bytes\":231},{\"atom_id\":\"design-everyday-things-design-for-use\",\"file_sha256\":\"e5d834ca932fc3432d3c2774b3d77548d51c4dd12d8a2a42b3105118f063ad42\",\"content_sha256\":\"231b5b87c050708b13a074891fbf7e10f96d738f870b9f5a50fd133f9050a8cc\",\"file_bytes\":1349,\"body_bytes\":217},{\"atom_id\":\"design-everyday-things-diagnostic\",\"file_sha256\":\"a851a60b905470ca5d49d5449d62e23d909fc7c981923c46ebb17da9e7f2099c\",\"content_sha256\":\"096ccab9b8bbcb729eb914d25151cc983733a7f96c4f6b388af5d9174aefdb0b\",\"file_bytes\":1254,\"body_bytes\":166},{\"atom_id\":\"design-everyday-things-discoverability\",\"file_sha256\":\"a15eefdbdea7dda682c5e46b2fa34b497a3c3bfb3e8340554e52306e6d962f5e\",\"content_sha256\":\"2cb99883c95e370b3d3cdc62fa2899bebfbdf1db7503cc93c8048ec874cd6e7b\",\"file_bytes\":1207,\"body_bytes\":169}]"
carrier_sha256: 88899036784af3088f62e2439a51b65ee3f01fd25b2ce6265e19515c41bd771e
carrier_bytes: 11231
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-everyday-things-affordances -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-affordances
title: "Distinguish real, perceived and false affordances"
summary: Signal digital controls and separate interactive elements from decorative ones; avoid false and anti-affordances.
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing controls or reviewing interactive signals.
conditions_does_not_apply_when: A static illustration with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Interactive and decorative elements are visually distinct and signals match behavior.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L62-L87"
status: active
revision: 1
---

# Distinguish real, perceived and false affordances

Design for perceived affordances; distinguish real, perceived, hidden, false, anti-affordances; signal digital controls and distinguish interactive/decorative elements.
<!-- vpmodule:atom:end design-everyday-things-affordances -->
<!-- vpmodule:atom:begin design-everyday-things-blame-design -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-blame-design
title: Look to design when people err
summary: Treat human error as a design flaw rather than blaming the person.
capability_tags:
  - design-user-interface
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: Investigating a user error.
conditions_does_not_apply_when: A deliberate misuse that the design cannot prevent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The analysis identifies the design condition that made the error likely.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L197-L200"
status: active
revision: 1
---

# Look to design when people err

When someone errs, look for a design flaw rather than blaming the person.
<!-- vpmodule:atom:end design-everyday-things-blame-design -->
<!-- vpmodule:atom:begin design-everyday-things-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-common-mistakes
title: Avoid common design mistakes
summary: "Avoid missing signifiers or feedback, blaming users, feature creep, inconsistency and ignored context."
capability_tags:
  - audit-accessibility
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a design for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the design correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L262-L272"
status: active
revision: 1
---

# Avoid common design mistakes

Avoid missing signifiers/feedback, blaming users, feature creep, inconsistency, ignored context; apply listed remedies.
<!-- vpmodule:atom:end design-everyday-things-common-mistakes -->
<!-- vpmodule:atom:begin design-everyday-things-conceptual-models -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-conceptual-models
title: "Align the user's and designer's models"
summary: "Use a clear system image, familiar metaphors, visible state, consistency, feedback and progressive disclosure."
capability_tags:
  - design-user-interface
pattern_tags:
  - domain-language
conditions_applies_when: Designing a system whose behavior users must understand.
conditions_does_not_apply_when: A one-step action with no model to learn.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The system image supports the model users need to operate it.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L179-L196"
status: active
revision: 1
---

# Align the user's and designer's models

Align user/design models through clear system image, familiar metaphors, visible state, consistent behavior, feedback, progressive disclosure.
<!-- vpmodule:atom:end design-everyday-things-conceptual-models -->
<!-- vpmodule:atom:begin design-everyday-things-constraints -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-constraints
title: Constrain actions to prevent errors
summary: "Use physical, cultural, semantic and logical constraints, validate input, disable unavailable options and allow reversal."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing an interaction with a wrong-action risk.
conditions_does_not_apply_when: A free-form task with no predictable wrong action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Wrong actions are prevented or reversible where practical.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L131-L153"
status: active
revision: 1
---

# Constrain actions to prevent errors

Constrain actions using physical/cultural/semantic/logical means; validate input, disable unavailable options, allow reversing forced sequences; make wrong actions impossible where practical.
<!-- vpmodule:atom:end design-everyday-things-constraints -->
<!-- vpmodule:atom:begin design-everyday-things-design-for-use -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-design-for-use
title: Make actions discoverable and outcomes understandable
summary: "Treat design as unobtrusive support for users' needs, and look to design when an action or outcome fails."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing or reviewing any user-facing artifact.
conditions_does_not_apply_when: A purely decorative artifact with no user action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Users can discover the action and understand the result without a manual.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L14-L17"
status: active
revision: 1
---

# Make actions discoverable and outcomes understandable

Good design is unobtrusive when it fits users' needs; when something fails, look to design, which should make actions discoverable and outcomes understandable.
<!-- vpmodule:atom:end design-everyday-things-design-for-use -->
<!-- vpmodule:atom:begin design-everyday-things-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-diagnostic
title: Run the design-of-everyday-things diagnostic
summary: "Audit discoverability, understanding, recovery, control-output mapping and constraints."
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
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L273-L284"
status: active
revision: 1
---

# Run the design-of-everyday-things diagnostic

Audit discoverability, understanding, recovery, control-output mapping, constraints; apply listed actions on failure.
<!-- vpmodule:atom:end design-everyday-things-diagnostic -->
<!-- vpmodule:atom:begin design-everyday-things-discoverability -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-discoverability
title: Make actions discoverable
summary: "Use affordances, signifiers, constraints, mappings and feedback so new users can act quickly."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing or reviewing action discoverability.
conditions_does_not_apply_when: A non-interactive display.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A new user can discover the action quickly.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L54-L61"
status: active
revision: 1
---

# Make actions discoverable

Make actions discoverable through affordances, signifiers, constraints, mappings, feedback; improve design if new users cannot quickly act.
<!-- vpmodule:atom:end design-everyday-things-discoverability -->