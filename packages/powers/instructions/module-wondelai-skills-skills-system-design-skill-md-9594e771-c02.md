---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-system-design-skill-md-9594e771-c02"
title: "wondelai-skills: skills/system-design/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/system-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/system-design/SKILL.md\"}"
atom_ids:
  - system-design-requirements-first
  - system-design-score
atom_count: 2
atoms: "[{\"atom_id\":\"system-design-requirements-first\",\"file_sha256\":\"8ae8dd0627fed53646840dac54dd211a47a15baa6d2fd96dba6e95dfe0225c6d\",\"content_sha256\":\"0b94f36ff0408880c753a7a4d96bd190dd3e19bd277c85ac82c6f3b09493b3d0\",\"file_bytes\":1413,\"body_bytes\":259},{\"atom_id\":\"system-design-score\",\"file_sha256\":\"3fd2bbf22a71e95304edc5be1d50b389d822cab24392735d3ea6804a1e14c1af\",\"content_sha256\":\"99ec428aa2c4b6553d57f2dae1244a82149f3cbdeaf309bd3858b2216bcaa59b\",\"file_bytes\":1511,\"body_bytes\":363}]"
carrier_sha256: e711fadd058f717d61afd8dc9281575173024719ac5bca6e497c52bc53328b44
carrier_bytes: 3141
revision: 1
status: active
---
<!-- vpmodule:atom:begin system-design-requirements-first -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-requirements-first
title: Start system design from requirements and constraints
summary: "Choose and size familiar building blocks from requirements and estimates, and own the tradeoffs those choices introduce."
capability_tags:
  - design-structure
pattern_tags:
  - implementation-planning
conditions_applies_when: Designing a system or proposing an architecture.
conditions_does_not_apply_when: A local implementation choice with no system-level tradeoff.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design names its requirements, constraints and the tradeoffs of each chosen building block."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L14-L17"
status: active
revision: 1
---

# Start system design from requirements and constraints

Start system design from requirements and constraints rather than selecting solutions first. Choose and size familiar building blocks using estimates, and own the tradeoffs introduced by those choices.
<!-- vpmodule:atom:end system-design-requirements-first -->
<!-- vpmodule:atom:begin system-design-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-score
title: Score the design against the system-design diagnostic
summary: "Score the eight diagnostic rows, state the current score and failing rows, and give a specific fix for each."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a system design against the eight diagnostic rows.
conditions_does_not_apply_when: A narrow code review that does not assess system design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, the failing rows and a specific fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the design against the system-design diagnostic

Score a design against the eight Quick Diagnostic rows using round(passed / 8 × 10); the source defines score bands by completeness of requirements, estimates, redundancy, database and cache strategy, queues, monitoring, and deployment. State the current score, failing rows, and a specific fix for each.
<!-- vpmodule:atom:end system-design-score -->