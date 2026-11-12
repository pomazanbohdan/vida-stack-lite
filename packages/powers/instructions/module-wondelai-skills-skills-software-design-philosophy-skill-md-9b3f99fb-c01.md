---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-software-design-philosophy-skill-md-9b3f99fb-c01"
title: "wondelai-skills: skills/software-design-philosophy/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/software-design-philosophy/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/software-design-philosophy/SKILL.md\"}"
atom_ids:
  - software-design-comments
  - software-design-common-mistakes
  - software-design-complexity-budget
  - software-design-deep-modules
  - software-design-diagnostic
  - software-design-general-interfaces
  - software-design-information-hiding
  - software-design-reduce-complexity
atom_count: 8
atoms: "[{\"atom_id\":\"software-design-comments\",\"file_sha256\":\"bd6b75adea9bd9c4f8d4814e6a29ae5aab320a5201e217ba2b7ebb169804e383\",\"content_sha256\":\"2963144919a92c7cf1d2bfa6b6ebf857425d126e51da01144a9fce056b3033cf\",\"file_bytes\":1482,\"body_bytes\":295},{\"atom_id\":\"software-design-common-mistakes\",\"file_sha256\":\"61697040138b93c74f348b05f2fee95f8864ae9bad783abc5358b36dc07371a2\",\"content_sha256\":\"cdbb50ee61a92f9f58b86b1def0566306c68ef82fe1dd973d5ad803c90560601\",\"file_bytes\":1454,\"body_bytes\":281},{\"atom_id\":\"software-design-complexity-budget\",\"file_sha256\":\"8fe9e7bb5f6320b9159ed75e4e1de9c9d26f9281935368518a789dcf59488f0d\",\"content_sha256\":\"a29a6ceb80413ca0c5b32ec6b9bdf7c426915324b79f285df3242612990fc60b\",\"file_bytes\":1404,\"body_bytes\":224},{\"atom_id\":\"software-design-deep-modules\",\"file_sha256\":\"30b8f6ef8ede7723c74628b61227028647663fb37c0d4b17be096dd609517a89\",\"content_sha256\":\"53d84172a89d6a8829deab2f657b7b23fe0d2c02c2e0ab391491565ebd771fc1\",\"file_bytes\":1458,\"body_bytes\":315},{\"atom_id\":\"software-design-diagnostic\",\"file_sha256\":\"1a1eaa5caca8106ba200ca7eddd21050cce74f7b8e0d9435bd01654011c6d2e6\",\"content_sha256\":\"2ebac9166778dcc2f2698135c1df192c65e1b854212f6f08dddd6e00251de27e\",\"file_bytes\":1409,\"body_bytes\":256},{\"atom_id\":\"software-design-general-interfaces\",\"file_sha256\":\"8b55f02f84af3976dc5f2ff3a1d0f8bd299ae29ad9ed08947164d22ebea4712c\",\"content_sha256\":\"93bfbb1f41fafc0442a636f5c5af5df33d797f97126be2d21bec041f23c1a516\",\"file_bytes\":1576,\"body_bytes\":359},{\"atom_id\":\"software-design-information-hiding\",\"file_sha256\":\"47dc7a35ad592aa48668ea537e0b731e47f87a345ac2bfbc681971e84b09158f\",\"content_sha256\":\"77a6a7bc9d62ea67a2bcdc285ae4dd6e8141a24ac19de113c24573b650a9fddf\",\"file_bytes\":1505,\"body_bytes\":326},{\"atom_id\":\"software-design-reduce-complexity\",\"file_sha256\":\"984f5d109e0cc6f04eff795038cf36b79a23659509c8cae7883f00fa93a2bc4f\",\"content_sha256\":\"0821fd3be991e64160a3030ce8573c7e919985c45e60379854b58cd1147f2d0b\",\"file_bytes\":1550,\"body_bytes\":346}]"
carrier_sha256: 216602c6239c34f282c1615c4c0475172c179c104de9b7ea4820ce1db1143ecc
carrier_bytes: 12787
revision: 1
status: active
---
<!-- vpmodule:atom:begin software-design-comments -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-comments
title: Use comments to record design intent
summary: "Explain non-obvious intent, abstraction rationale, invariants and assumptions near the code, and update comments with the code."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - technical-writing
conditions_applies_when: Documenting non-obvious code or reviewing whether comments are needed.
conditions_does_not_apply_when: A comment that merely restates the code.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Comments explain design intent or invariants that the code cannot express, and they remain current with the code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L120-L142"
status: active
revision: 1
---

# Use comments to record design intent

Use comments to explain non-obvious design intent, abstraction rationale, invariants and assumptions rather than restating code. Keep comments near the code and update them with it; consider hard-to-write comments a signal that design may be too complex.
<!-- vpmodule:atom:end software-design-comments -->
<!-- vpmodule:atom:begin software-design-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-common-mistakes
title: Avoid common software-design mistakes
summary: "Avoid shallow classes, temporal decomposition, exposed implementation details, missing design comments, excessive configuration, tactical shortcuts, pass-through methods and over-specialized interfaces."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a design for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the design correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L165-L177"
status: active
revision: 1
---

# Avoid common software-design mistakes

Avoid shallow classes, temporal decomposition, exposed implementation details, missing design comments, excessive configuration, tactical shortcuts, pass-through methods and over-specialized interfaces; apply the listed design corrections.
<!-- vpmodule:atom:end software-design-common-mistakes -->
<!-- vpmodule:atom:begin software-design-complexity-budget -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-complexity-budget
title: Judge design by its effect on complexity
summary: Minimize unnecessary complexity and keep necessary complexity concentrated where it can be managed.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Evaluating a design decision that affects how hard the system is to understand or change.
conditions_does_not_apply_when: A local change with no structural effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The decision states whether it increases or decreases complexity and where the remaining complexity is concentrated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L14-L17"
status: active
revision: 1
---

# Judge design by its effect on complexity

Evaluate design decisions by whether they increase or decrease overall complexity, aiming to minimize unnecessary complexity and concentrate necessary complexity where manageable.
<!-- vpmodule:atom:end software-design-complexity-budget -->
<!-- vpmodule:atom:begin software-design-deep-modules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-deep-modules
title: Prefer deep modules with simple interfaces
summary: "Judge abstractions by the functionality hidden behind the interface, not by module size, and avoid shallow modules."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing or refactoring module boundaries and interfaces.
conditions_does_not_apply_when: An interface fixed by an external API.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface hides substantial functionality and does not impose more complexity than it removes.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L54-L75"
status: active
revision: 1
---

# Prefer deep modules with simple interfaces

Prefer deep modules that provide powerful functionality through simple interfaces; avoid shallow modules whose interfaces impose more complexity than their functionality hides. Judge abstractions by depth, not size, and merge related shallow classes where appropriate.
<!-- vpmodule:atom:end software-design-deep-modules -->
<!-- vpmodule:atom:begin software-design-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-diagnostic
title: Run the software-design diagnostic
summary: "Check module purpose, interface depth, information hiding, interface comments, complexity review, hidden decisions, newcomer understanding and regular design improvement."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a design.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L178-L190"
status: active
revision: 1
---

# Run the software-design diagnostic

Use the eight diagnostic questions to check coherent module purpose, interface depth, information hiding, interface comments, complexity review, hidden decisions, newcomer understanding and regular design improvement.
<!-- vpmodule:atom:end software-design-diagnostic -->
<!-- vpmodule:atom:begin software-design-general-interfaces -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-general-interfaces
title: Make interfaces general enough but not speculative
summary: "Cover current uses with the simplest interface, push complexity downward, and avoid configuration that offloads decisions to callers."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a module interface or reviewing its configurability.
conditions_does_not_apply_when: An interface already fixed by a caller contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface covers current uses without speculative generality or configuration parameters that shift decisions to callers.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L98-L119"
status: active
revision: 1
---

# Make interfaces general enough but not speculative

Choose an interface general enough for current uses but not speculative future needs; ask for the simplest interface covering current needs. Push complexity downward, avoid configuration parameters that offload decisions to callers, and favor the simpler somewhat general-purpose approach when uncertain.
<!-- vpmodule:atom:end software-design-general-interfaces -->
<!-- vpmodule:atom:begin software-design-information-hiding -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-information-hiding
title: Hide design decisions that other modules do not need
summary: "Prevent design decisions from leaking across modules, organize around shared knowledge, and account for back-door and decorator leakage."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Organizing modules or reviewing coupling between them.
conditions_does_not_apply_when: A decision that is deliberately public contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each design decision is encapsulated in one module and does not leak through the interface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L76-L97"
status: active
revision: 1
---

# Hide design decisions that other modules do not need

Encapsulate knowledge that other modules do not need; avoid leaking a design decision across modules. Organize by shared knowledge rather than temporal sequence, account for back-door and decorator leakage, and merge modules or encapsulate shared knowledge when needed.
<!-- vpmodule:atom:end software-design-information-hiding -->
<!-- vpmodule:atom:begin software-design-reduce-complexity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-reduce-complexity
title: Reduce complexity from dependencies and obscurity
summary: "Look for change amplification, cognitive load and unknown unknowns; centralize knowledge and make dependencies and names explicit."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Diagnosing a system that is hard to understand or modify.
conditions_does_not_apply_when: Complexity that is inherent to the problem and cannot be removed.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design reduces change amplification, cognitive load or unknown unknowns rather than relocating them."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L33-L53"
status: active
revision: 1
---

# Reduce complexity from dependencies and obscurity

Treat complexity as structure that makes systems hard to understand or modify; look for change amplification, cognitive load and unknown unknowns, caused by dependencies or obscurity. Reduce these through centralized knowledge, lower cognitive burden, explicit dependencies and precise names.
<!-- vpmodule:atom:end software-design-reduce-complexity -->