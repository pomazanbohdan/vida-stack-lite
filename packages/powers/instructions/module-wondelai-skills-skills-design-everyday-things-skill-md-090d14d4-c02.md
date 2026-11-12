---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-design-everyday-things-skill-md-090d14d4-c02"
title: "wondelai-skills: skills/design-everyday-things/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/design-everyday-things/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/design-everyday-things/SKILL.md\"}"
atom_ids:
  - design-everyday-things-evaluation
  - design-everyday-things-execution
  - design-everyday-things-feedback
  - design-everyday-things-hcd
  - design-everyday-things-mappings
  - design-everyday-things-prevent-and-recover
  - design-everyday-things-score
  - design-everyday-things-seven-stages
atom_count: 8
atoms: "[{\"atom_id\":\"design-everyday-things-evaluation\",\"file_sha256\":\"101cd9f51fbf81fddab0a6c1c83f7bea258453a7a67bbf9a6a43a0f16f4be4d6\",\"content_sha256\":\"35222422113fbee10132a03a21a42785852976c40576efe2d809fa1471a560af\",\"file_bytes\":1234,\"body_bytes\":143},{\"atom_id\":\"design-everyday-things-execution\",\"file_sha256\":\"201c044c2ce11e1201f5b9dc3c1d3775028651da64c25dcd5d5f10ea78af8fc7\",\"content_sha256\":\"9ac3325bdea914e3e04b88d88d0de212881e939e1e5ba65ae0c279abe93341c2\",\"file_bytes\":1241,\"body_bytes\":148},{\"atom_id\":\"design-everyday-things-feedback\",\"file_sha256\":\"573f2c9cfde29813cfc419139b74d4a2886d835092e53b37bce07bcb493942b1\",\"content_sha256\":\"009e29e077bfe95abaeb4f77b92d2347a9b2b631d200fa1a78e8303595bb5d27\",\"file_bytes\":1451,\"body_bytes\":340},{\"atom_id\":\"design-everyday-things-hcd\",\"file_sha256\":\"9eb3c51ee6f0290177b6d924c6ad0fe667f6d639932f60b3a21965b771fecc4e\",\"content_sha256\":\"a937376abc50509ebc81e8ad3a5abded88e51b2b3106813722eba5234ae84b7b\",\"file_bytes\":1464,\"body_bytes\":333},{\"atom_id\":\"design-everyday-things-mappings\",\"file_sha256\":\"3ae325cf7fd007744bd04e2537a99e0eb8ec2d489bf24ebb23910976562d85f9\",\"content_sha256\":\"9e3dde22636c67e05a243be5a5e2a3f68b5ddb1e2dfe965119f83c9a66407a45\",\"file_bytes\":1322,\"body_bytes\":194},{\"atom_id\":\"design-everyday-things-prevent-and-recover\",\"file_sha256\":\"d116d54142850c3d43e8850c0dcc7d669b018e5115960d02c4233c9f1ff00758\",\"content_sha256\":\"8c6c03e659493973d4fc2a87681d0085c549710d1fa39d62ad691d9d8ebaebac\",\"file_bytes\":1372,\"body_bytes\":232},{\"atom_id\":\"design-everyday-things-score\",\"file_sha256\":\"83aba57750632648e1ed835f7c88493d5d3725649aa0d239ca184d86c17b7b0a\",\"content_sha256\":\"7a0a144157dc20a35d3a79a86c953a32348f1051d0cceb059c9d126829f994d6\",\"file_bytes\":1518,\"body_bytes\":386},{\"atom_id\":\"design-everyday-things-seven-stages\",\"file_sha256\":\"50ba89b5a883e7feb9c6a21b002286a8587dcb6789155f83e5cf8764ec7e42fa\",\"content_sha256\":\"5ce63f5915b189f18dddf0ab72916d02c404b8be5ef0c3553619fdea8de07a60\",\"file_bytes\":1285,\"body_bytes\":226}]"
carrier_sha256: d009c47703095b0278ef003c66db3c616d9dc08cc9f066b846b08a4176fd8c6c
carrier_bytes: 11866
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-everyday-things-evaluation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-evaluation
title: Help users understand outcomes
summary: "Provide immediate visible feedback, meaningful errors and progress indicators for results and state."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing the feedback side of an interaction.
conditions_does_not_apply_when: An instantaneous action with no perceptible result.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The user can tell what happened and what state the system is in.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L42-L51"
status: active
revision: 1
---

# Help users understand outcomes

Help users understand results/state with immediate visible feedback, meaningful errors, progress indicators.
<!-- vpmodule:atom:end design-everyday-things-evaluation -->
<!-- vpmodule:atom:begin design-everyday-things-execution -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-execution
title: Help users act
summary: "Make possible actions and how to perform them identifiable, and test with a new user rather than relying on a manual."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing the action side of an interaction.
conditions_does_not_apply_when: An action that is intentionally hidden from most users.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A new user can identify and perform the action without a manual.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L36-L41"
status: active
revision: 1
---

# Help users act

Help users identify possible actions/how to perform them; test with a new user; do not rely on a manual to explain failed design.
<!-- vpmodule:atom:end design-everyday-things-execution -->
<!-- vpmodule:atom:begin design-everyday-things-feedback -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-feedback
title: "Give timely, informative feedback"
summary: "Respond within 0.1 seconds for direct manipulation, use progress feedback around one and ten seconds, and dose feedback to context."
capability_tags:
  - design-user-interface
pattern_tags:
  - operational-telemetry
conditions_applies_when: Designing feedback for an action with latency.
conditions_does_not_apply_when: An action with no perceptible delay.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Feedback is immediate, informative and appropriate to the wait."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L154-L178"
status: active
revision: 1
---

# Give timely, informative feedback

Feedback must be immediate (within 0.1s for direct manipulation), informative, appropriately dosed, and non-intrusive. Use visual, auditory, haptic, or progress feedback by context. Around 1s, change the cursor; around 10s, show progress; for longer operations, show percentage and allow backgrounding.
<!-- vpmodule:atom:end design-everyday-things-feedback -->
<!-- vpmodule:atom:begin design-everyday-things-hcd -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-hcd
title: Use human-centered design
summary: "Observe real contexts, generate ideas, prototype, test with real users and iterate, observing behavior rather than opinions."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Designing a new product or significant interaction.
conditions_does_not_apply_when: A small change with an already validated pattern.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The process observes real use and tests with real users rather than relying on designer opinion.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L254-L261"
status: active
revision: 1
---

# Use human-centered design

Use observation, idea generation, prototyping, testing, and iteration. In observation, watch real contexts/workarounds rather than asking users what they want; in testing, use real users, not designers, and observe behavior rather than opinions (the source says five users reveal about 85% of problems).
<!-- vpmodule:atom:end design-everyday-things-hcd -->
<!-- vpmodule:atom:begin design-everyday-things-mappings -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-mappings
title: Map controls naturally to effects
summary: "Place controls near their targets, mirror layouts, follow expected direction, group related controls and respect conventions."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Designing control layout or spatial relationships.
conditions_does_not_apply_when: A control whose placement is fixed by the platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The control-effect mapping matches spatial and cultural expectations.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L110-L130"
status: active
revision: 1
---

# Map controls naturally to effects

Map controls naturally to effects: near targets, mirror layouts, follow expected direction, group related controls, respect cultural/sequential conventions.
<!-- vpmodule:atom:end design-everyday-things-mappings -->
<!-- vpmodule:atom:begin design-everyday-things-prevent-and-recover -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-prevent-and-recover
title: Prevent errors and support recovery
summary: "Use constraints, undo, confirmation, defaults and forgiving input to prevent; use clear messages, preserved work and reset paths to recover."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing a flow with destructive or error-prone actions.
conditions_does_not_apply_when: A read-only flow with no error risk.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The flow prevents likely errors and lets users recover without losing work.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L220-L233"
status: active
revision: 1
---

# Prevent errors and support recovery

Prevent with constraints, undo/redo, destructive-action confirmation, defaults, forgiving input. Recover with clear messages, preserved work, partial saves, known-good reset, alternative path.
<!-- vpmodule:atom:end design-everyday-things-prevent-and-recover -->
<!-- vpmodule:atom:begin design-everyday-things-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-score
title: Score the design against the two gulfs
summary: "Score five diagnostic rows for discoverability, evaluation, recovery, mapping and constraints, and report failing rows."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a user interface against the two-gulf model.
conditions_does_not_apply_when: A narrow visual review that does not assess use.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failing_rows
artifact_contract_verified_by: The report states the score and failing rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the design against the two gulfs

Score 2 points per satisfied diagnostic row (five rows: discoverability, evaluation, error recovery, mapping, constraints). Bands: 9-10 means users act without instructions, understand outcomes, and recover; 5-6 means one gulf or error path is broken; <=3 means users need a manual or routinely blame themselves. Report score and failing rows.
<!-- vpmodule:atom:end design-everyday-things-score -->
<!-- vpmodule:atom:begin design-everyday-things-seven-stages -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-seven-stages
title: Walk through the seven stages of action
summary: "Check goal, plan, specify, perform, perceive, interpret and compare, supporting both action and evaluation."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: Analyzing a complete user interaction.
conditions_does_not_apply_when: An isolated visual element.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each stage is supported or its gap is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L234-L253"
status: active
revision: 1
---

# Walk through the seven stages of action

Walk interactions through goal, plan, specify, perform, perceive, interpret, compare; support action with signifiers/mappings/constraints/affordances, evaluation with feedback/state.
<!-- vpmodule:atom:end design-everyday-things-seven-stages -->