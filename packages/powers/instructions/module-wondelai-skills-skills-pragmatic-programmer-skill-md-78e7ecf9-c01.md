---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-pragmatic-programmer-skill-md-78e7ecf9-c01"
title: "wondelai-skills: skills/pragmatic-programmer/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/pragmatic-programmer/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/pragmatic-programmer/SKILL.md\"}"
atom_ids:
  - pragmatic-programmer-broken-windows
  - pragmatic-programmer-common-mistakes
  - pragmatic-programmer-contracts
  - pragmatic-programmer-craft
  - pragmatic-programmer-diagnostic
  - pragmatic-programmer-dry
  - pragmatic-programmer-estimation
  - pragmatic-programmer-orthogonality
atom_count: 8
atoms: "[{\"atom_id\":\"pragmatic-programmer-broken-windows\",\"file_sha256\":\"28529edcbefe0e4977dc40b7a19dfe36698be7e303507ffa6e93e7772f16b0ac\",\"content_sha256\":\"c5aee56c6359c45f75b0250ea1a9ae7a41b124e2b55ac4d0718bb55dd767c837\",\"file_bytes\":1254,\"body_bytes\":187},{\"atom_id\":\"pragmatic-programmer-common-mistakes\",\"file_sha256\":\"7bebc069bafc123a7dc5a370c6e3177614e4e0a310f7a8c3b81d55d715f21d84\",\"content_sha256\":\"ae6157288b759f66422558169914e2e0b2d2b8a1d262c41be83c6a252a82dba1\",\"file_bytes\":1437,\"body_bytes\":289},{\"atom_id\":\"pragmatic-programmer-contracts\",\"file_sha256\":\"c71fb6cfcfc5589d75c432b29f758f1ff966709b4070f11e6c8c164df2361a77\",\"content_sha256\":\"7e8ce5756f87d85bc4891c5e2f3c689cd741023d1ec694483390dafde4a1e60d\",\"file_bytes\":1377,\"body_bytes\":244},{\"atom_id\":\"pragmatic-programmer-craft\",\"file_sha256\":\"648054d1871790eeb16c7c843904756d8c826f818afbfe60d21ed3e3867d32d2\",\"content_sha256\":\"42c0834718fa3e79b2b32b1b2f61f6c2edecb07eed950a79e66dca6a26fdae8e\",\"file_bytes\":1474,\"body_bytes\":303},{\"atom_id\":\"pragmatic-programmer-diagnostic\",\"file_sha256\":\"fd7e1ae311672545cbebcc507f065b0d78a7c5fc0d1821f748570eb2e9a0995f\",\"content_sha256\":\"2270a20d2be068a5ecea2dfb3d95ff6318e98f134aa204895c76a41dedd523f7\",\"file_bytes\":1329,\"body_bytes\":231},{\"atom_id\":\"pragmatic-programmer-dry\",\"file_sha256\":\"f8dda5902ec47c320e51f0017caed59e4e567f29c2c190114231072e36dc0f44\",\"content_sha256\":\"5b54e69c79a520df2032774d13f82042f388abf55a3e07b2c08b63aae4116fd4\",\"file_bytes\":1383,\"body_bytes\":272},{\"atom_id\":\"pragmatic-programmer-estimation\",\"file_sha256\":\"4d7d9b468e7f713e37b8ada4596911d9719014d6771744083190a50c0c41d4b1\",\"content_sha256\":\"1264cea1dc9d8748b048d43889d6844e0aba3d54f1f9a448eca444fc9f8a519c\",\"file_bytes\":1359,\"body_bytes\":221},{\"atom_id\":\"pragmatic-programmer-orthogonality\",\"file_sha256\":\"8f4dbdca94f8ffa1af1e32f1824a92e226c7f13e2f74fc410925bdfd557be62d\",\"content_sha256\":\"e6874b9d8447c30ec21e3a27307f4b1e792f3d81fc9b2d4811bd485b83e8990e\",\"file_bytes\":1325,\"body_bytes\":225}]"
carrier_sha256: 6d0acca3cf07b8ae0240fbc9052f83af71d7fff7bb9e3c43f8a860f7919da63d
carrier_bytes: 11895
revision: 1
status: active
---
<!-- vpmodule:atom:begin pragmatic-programmer-broken-windows -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-broken-windows
title: Repair broken windows
summary: Fix or isolate visible defects promptly and maintain an agreed quality bar.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Maintaining a codebase with visible defects or disorder.
conditions_does_not_apply_when: Generated or vendored code that must not be edited.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Visible defects are fixed or explicitly contained with a tracked follow-up.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L124-L146"
status: active
revision: 1
---

# Repair broken windows

Treat neglected defects and disorder as broken windows that invite further neglect; fix or isolate visible problems promptly, and maintain an agreed quality bar.
<!-- vpmodule:atom:end pragmatic-programmer-broken-windows -->
<!-- vpmodule:atom:begin pragmatic-programmer-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-common-mistakes
title: Avoid common pragmatic-programming mistakes
summary: "Avoid duplicated knowledge, tight coupling, untested architecture, missing contracts, tolerated disorder, irreversible choices, point estimates and stagnant learning."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing code or architecture for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the issue.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L193-L204"
status: active
revision: 1
---

# Avoid common pragmatic-programming mistakes

Avoid duplicated knowledge, tightly coupled components, untested architecture, missing contracts, tolerated disorder, irreversible vendor or database choices, single-point estimates and stagnant learning; use the listed corrective practices.
<!-- vpmodule:atom:end pragmatic-programmer-common-mistakes -->
<!-- vpmodule:atom:begin pragmatic-programmer-contracts -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-contracts
title: State and enforce contracts at boundaries
summary: "State preconditions, postconditions and invariants; fail early and do not use assertions for expected errors."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Defining or reviewing module boundaries and public operations.
conditions_does_not_apply_when: Internal helpers with no contract exposed outside their module.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Contract violations fail early and expected errors use normal error handling.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L100-L123"
status: active
revision: 1
---

# State and enforce contracts at boundaries

State preconditions, postconditions and invariants at boundaries; validate assumptions with assertions, fail early when contracts are violated, and do not use assertions for expected runtime errors.
<!-- vpmodule:atom:end pragmatic-programmer-contracts -->
<!-- vpmodule:atom:begin pragmatic-programmer-craft -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-craft
title: Treat software craft as continuous learning
summary: "Care about craft through learning, disciplined practice and responsibility, and favor easy-to-change, understandable code."
capability_tags:
  - simplify-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Writing, reviewing or maintaining software where long-term change and trust matter."
conditions_does_not_apply_when: Throwaway scripts or generated code that will not be maintained.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change reflects a deliberate, maintainable choice rather than a shortcut."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat software craft as continuous learning

Care about craft through continuous learning, disciplined practice and personal responsibility. Consider context, trade-offs and long-term effects; avoid duplicated knowledge, keep components orthogonal, and make code easy to change, understand and trust.
<!-- vpmodule:atom:end pragmatic-programmer-craft -->
<!-- vpmodule:atom:begin pragmatic-programmer-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-diagnostic
title: Run the pragmatic diagnostic
summary: "Use the seven diagnostic questions to assess orthogonality, end-to-end slices, authoritative rules, quality, estimates, rollback speed and learning."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a codebase or change.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report lists findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L205-L216"
status: active
revision: 1
---

# Run the pragmatic diagnostic

Use the seven diagnostic questions and actions to assess orthogonality, working end-to-end slices, single authoritative rules, codebase quality, range estimates, rollback speed and ongoing learning.
<!-- vpmodule:atom:end pragmatic-programmer-diagnostic -->
<!-- vpmodule:atom:begin pragmatic-programmer-dry -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-dry
title: Keep one authoritative representation of knowledge
summary: "DRY applies to knowledge and intent, not repeated text; remove conflicting copies."
capability_tags:
  - simplify-code
pattern_tags:
  - structural-design
conditions_applies_when: "Representing rules, logic, schemas or configuration."
conditions_does_not_apply_when: Similar-looking code that implements different rules or coincidental duplication.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule has one authoritative source and no conflicting copy remains.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L31-L53"
status: active
revision: 1
---

# Keep one authoritative representation of knowledge

Give each piece of knowledge one unambiguous authoritative representation. DRY applies to knowledge and intent, not merely repeated text; avoid duplicating rules, logic or configuration, and remove conflicting copies.
<!-- vpmodule:atom:end pragmatic-programmer-dry -->
<!-- vpmodule:atom:begin pragmatic-programmer-estimation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-estimation
title: Estimate with ranges and explicit uncertainty
summary: "Use ranges, track a knowledge portfolio and avoid false precision."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Planning work or communicating estimates under uncertainty.
conditions_does_not_apply_when: A fixed commitment imposed by an external contract; report uncertainty separately.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The estimate states a range and its uncertainty rather than a single false-precision number.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L170-L192"
status: active
revision: 1
---

# Estimate with ranges and explicit uncertainty

Estimate with ranges and explicit uncertainty rather than false precision; maintain a knowledge portfolio by regularly learning, diversifying and tracking relevant skills.
<!-- vpmodule:atom:end pragmatic-programmer-estimation -->
<!-- vpmodule:atom:begin pragmatic-programmer-orthogonality -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: pragmatic-programmer-orthogonality
title: Keep components orthogonal
summary: "Separate concerns, avoid global state and minimize coupling while preserving cohesive responsibilities."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Designing or reviewing modules, components or services."
conditions_does_not_apply_when: Coupling fixed by an external framework that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A change in one component does not force unrelated changes elsewhere.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/pragmatic-programmer/SKILL.md; sha256=7bd0a042aa2dd559f0327916f8d4f2dcf7d21e5f2343a193eaafee932f0f85a3; locator=skills/pragmatic-programmer/SKILL.md#L54-L76"
status: active
revision: 1
---

# Keep components orthogonal

Keep components independent so a change in one does not cause unrelated changes elsewhere. Separate concerns, avoid global state and minimize coupling while preserving cohesive responsibilities.
<!-- vpmodule:atom:end pragmatic-programmer-orthogonality -->