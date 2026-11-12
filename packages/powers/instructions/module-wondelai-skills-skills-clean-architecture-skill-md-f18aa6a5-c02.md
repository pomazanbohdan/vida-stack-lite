---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-clean-architecture-skill-md-f18aa6a5-c02"
title: "wondelai-skills: skills/clean-architecture/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/clean-architecture/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/clean-architecture/SKILL.md\"}"
atom_ids:
  - clean-architecture-entities-and-use-cases
  - clean-architecture-score
  - clean-architecture-solid
atom_count: 3
atoms: "[{\"atom_id\":\"clean-architecture-entities-and-use-cases\",\"file_sha256\":\"e915eaaf91c0f275ce399ccefa5ecca691c40b512bf192c90ad06e3d5da4b41f\",\"content_sha256\":\"1a451a58c860eb9c320a1c44ceb34afacc74c0ccb18b76e9a448c5151b7c5631\",\"file_bytes\":1776,\"body_bytes\":639},{\"atom_id\":\"clean-architecture-score\",\"file_sha256\":\"e4286b1e002a575ae4ce0973602be0734971507fbd7eaffcb657bcf5a1932b45\",\"content_sha256\":\"6d0c9768a6ad84e5a3a3cd73533e579fe3a6efdf915d39ca259d419a4f48bcf8\",\"file_bytes\":1525,\"body_bytes\":342},{\"atom_id\":\"clean-architecture-solid\",\"file_sha256\":\"d59ea921c48e4c0bd70ca726d44e4219439836f426f2a67d9edcee460d954aca\",\"content_sha256\":\"24294dfba6695744f13b73b5f6cfbf623b7f5779a38d11270bb744bb90b89ac6\",\"file_bytes\":1559,\"body_bytes\":525}]"
carrier_sha256: e1b6696ca6eeb4628297a37973bbeef3a36c6317d5d2c041ee7d63697f323862
carrier_bytes: 5211
revision: 1
status: active
---
<!-- vpmodule:atom:begin clean-architecture-entities-and-use-cases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-entities-and-use-cases
title: Separate entities from use cases
summary: "Entities hold enterprise rules; use cases hold application rules, one operation each, with request/response models and boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Modeling domain rules and application operations.
conditions_does_not_apply_when: A CRUD handler with no domain rule.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Entities have no framework dependency and each use case is one operation with request/response models.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L45-L68"
status: active
revision: 1
---

# Separate entities from use cases

Keep Entities for enterprise-wide business rules that would exist without software, and Use Cases for application-specific rules that orchestrate data to and from Entities. Entities are not database rows: they are objects or pure functions that encapsulate critical rules without framework dependencies. Use Cases accept Request Models and return Response Models, never framework objects; make each Use Case one application operation. An Interactor implements an input boundary and calls an output boundary. A Use Case change should never affect an Entity, while Entity changes may ripple to Use Cases.
<!-- vpmodule:atom:end clean-architecture-entities-and-use-cases -->
<!-- vpmodule:atom:begin clean-architecture-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-score
title: Score the architecture against the diagnostic
summary: "Score seven diagnostic rows, map 6-7 to 9-10, 4-5 to 6-8, 2-3 to 3-5 and 0-1 to 0-2, and report failed rows and inversions."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a clean-architecture implementation.
conditions_does_not_apply_when: A narrow code review that does not assess architecture.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - inversion-list
artifact_contract_verified_by: "The report states the score, failed diagnostic rows and the inversion needed for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the architecture against the diagnostic

Score one point for each of the seven Quick Diagnostic rows satisfied, then map the total to 0–10: 6–7 satisfied maps to 9–10; 4–5 maps to 6–8; 2–3 maps to 3–5; 0–1 maps to 0–2. Report the score, failed diagnostic rows, and the specific inversion needed to fix each failure.
<!-- vpmodule:atom:end clean-architecture-score -->
<!-- vpmodule:atom:begin clean-architecture-solid -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-solid
title: Apply SOLID at class and module level
summary: "SRP, OCP, LSP, ISP and DIP constrain class and module dependencies."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing or reviewing classes and module interfaces.
conditions_does_not_apply_when: A generated data class with no behavior or clients.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each principle is applied or its violation is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L116-L140"
status: active
revision: 1
---

# Apply SOLID at class and module level

Apply the five class- and module-level principles: SRP gives a module one reason to change by serving one actor; OCP extends behavior with new code rather than modifying existing code; LSP requires subtypes to work through the base interface without clients knowing, and is violated by unexpected exceptions or ignored methods; ISP keeps clients from depending on methods they do not use; DIP makes high- and low-level modules depend on abstractions defined by the high-level module.
<!-- vpmodule:atom:end clean-architecture-solid -->