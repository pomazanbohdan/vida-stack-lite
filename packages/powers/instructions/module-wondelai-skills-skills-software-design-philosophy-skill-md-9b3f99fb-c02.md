---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-software-design-philosophy-skill-md-9b3f99fb-c02"
title: "wondelai-skills: skills/software-design-philosophy/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/software-design-philosophy/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/software-design-philosophy/SKILL.md\"}"
atom_ids:
  - software-design-score
  - software-design-strategic-programming
atom_count: 2
atoms: "[{\"atom_id\":\"software-design-score\",\"file_sha256\":\"40d6b8e614747746de776fb763f0fbed13b259c9137114c19c977813d98fd7c0\",\"content_sha256\":\"474cff1ab3bd67216e01eea82dd6777c11526119ba9fb3edef609518f177f88a\",\"file_bytes\":1426,\"body_bytes\":238},{\"atom_id\":\"software-design-strategic-programming\",\"file_sha256\":\"78679971d4ae4e4fe2933f13384f05997ef7d8416fe6ffa7314603163f9cfaef\",\"content_sha256\":\"f4f2a474db89272a2e88e9c6edbe7ccd39251ee261906af33de401474adfc068\",\"file_bytes\":1412,\"body_bytes\":266}]"
carrier_sha256: d5cdcb7e2c2391da7205bbc6698e38d2d39d3c85b651a72283e2d908cdb7d7dc
carrier_bytes: 3069
revision: 1
status: active
---
<!-- vpmodule:atom:begin software-design-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-score
title: Score the design against the eight diagnostic rows
summary: "Score the eight diagnostic rows, sanity-check against the bands, and report the score, failed rows and changes needed."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a design against the software-design diagnostic.
conditions_does_not_apply_when: A narrow implementation review that does not assess design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - changes
artifact_contract_verified_by: "The report states the score, failed rows and the changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L18-L28"
status: active
revision: 1
---

# Score the design against the eight diagnostic rows

Score designs by the eight diagnostic rows at approximately 1.25 points each, sanity-check against the stated bands, and report the score, failed rows, and changes needed to reach 10.
<!-- vpmodule:atom:end software-design-score -->
<!-- vpmodule:atom:begin software-design-strategic-programming -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-strategic-programming
title: Invest in design while making changes
summary: "Prefer strategic programming, treat shortcuts as future complexity, and make refactoring part of feature work."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Implementing a feature or deciding whether to take a shortcut.
conditions_does_not_apply_when: A deliberately disposable prototype.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change improves or preserves structure, and any shortcut is recorded as future complexity."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L143-L164"
status: active
revision: 1
---

# Invest in design while making changes

Prefer strategic programming: invest additional effort in design and use changes to improve structure. Treat shortcuts as future complexity, make refactoring part of feature work, and review structure as well as correctness.
<!-- vpmodule:atom:end software-design-strategic-programming -->