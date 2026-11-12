---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-domain-driven-design-skill-md-a58864ce-c02"
title: "wondelai-skills: skills/domain-driven-design/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/domain-driven-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/domain-driven-design/SKILL.md\"}"
atom_ids:
  - ddd-score-domain-model
  - ddd-ubiquitous-language
atom_count: 2
atoms: "[{\"atom_id\":\"ddd-score-domain-model\",\"file_sha256\":\"7f79d2eb08ee3af5d297a203bc3f1ee393dc252480aa11a5ce5ff1307a89bff4\",\"content_sha256\":\"d8e630dc1ec4d91b8fd72f95631d6203e4b3c9de34166aef23d8434b359c0f90\",\"file_bytes\":1319,\"body_bytes\":204},{\"atom_id\":\"ddd-ubiquitous-language\",\"file_sha256\":\"9cbc38ab250a4d20283f17375b8bd9ef9586c1a9a52eedec34a1f4b2c1904d65\",\"content_sha256\":\"a5ceb03cd62a434ebfa0a091ae1bb1f657d7b270f5a4d4d956bd35165035392b\",\"file_bytes\":1349,\"body_bytes\":235}]"
carrier_sha256: ee49bbafc5f59f337e9b178d3e7caac528db64e4a758ffd1dca32cfb78bd01d0
carrier_bytes: 2873
revision: 1
status: active
---
<!-- vpmodule:atom:begin ddd-score-domain-model -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-score-domain-model
title: Score the domain model against the DDD diagnostic
summary: Score satisfied diagnostic rows plus the depth properties and report the score and failing rows.
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a domain model against the DDD diagnostic.
conditions_does_not_apply_when: A narrow implementation review that does not assess the domain model.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
artifact_contract_verified_by: The report states the score and the failing rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the domain model against the DDD diagnostic

Score one point for each satisfied diagnostic row and up to three additional points for the specified depth properties; report score and failing rows.
<!-- vpmodule:atom:end ddd-score-domain-model -->
<!-- vpmodule:atom:begin ddd-ubiquitous-language -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-ubiquitous-language
title: Use one ubiquitous language
summary: "Use a rigorous shared language across discussion, documentation and code, and refine the model when naming becomes difficult."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: Naming domain concepts or aligning developers with domain experts.
conditions_does_not_apply_when: Infrastructure names that have no domain meaning.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The same domain term is used in discussion, documentation and code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L24-L45"
status: active
revision: 1
---

# Use one ubiquitous language

Use a rigorous shared language between developers and domain experts across discussion, documentation and code; let changes in the language update the code, and use naming difficulty to refine the model.
<!-- vpmodule:atom:end ddd-ubiquitous-language -->