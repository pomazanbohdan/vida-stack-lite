---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-research-a-decision-md-b1fb4c4d-c01"
title: "bmad-method: docs/plan/research-a-decision.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/plan/research-a-decision.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/research-a-decision.md\"}"
atom_ids:
  - order-the-research-dimensions-and-prune-to-the-decision
  - write-a-research-prompt-for-another-tool
atom_count: 2
atoms: "[{\"atom_id\":\"order-the-research-dimensions-and-prune-to-the-decision\",\"file_sha256\":\"a1c7c4f15c9f22c6902d0bbff842a0fdfee3df7a05a1e339b8d6c0960a2d874f\",\"content_sha256\":\"a4dfd2e735b07b51f93fb1e3bfaf35bb83571058097a43929e4acf1ca269e8a8\",\"file_bytes\":2412,\"body_bytes\":375},{\"atom_id\":\"write-a-research-prompt-for-another-tool\",\"file_sha256\":\"f85a8832689ec38790a4fd7b9d2a5734a6dac29fc46422f37d9d9c0766ab4d3b\",\"content_sha256\":\"4a0eec6e985cf7ed89259a14c678372e87e9c2c9cc39e3325b90e2a5b5588b2f\",\"file_bytes\":1528,\"body_bytes\":361}]"
carrier_sha256: 7fefa01f9b34415c9ce6583f624964148092c714145d76003f59949823eb97f1
carrier_bytes: 4245
revision: 1
status: active
---
<!-- vpmodule:atom:begin order-the-research-dimensions-and-prune-to-the-decision -->
---
instruction_id: order-the-research-dimensions-and-prune-to-the-decision
title: Order the research dimensions and prune them to the decision
summary: "Every research pack covers a fixed set of dimensions in a stated priority order, and the dimensions that do not bear on the decision are pruned away."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A research pack is about to be worked.
conditions_does_not_apply_when: There is no fixed set of dimensions to order; the work is open-ended exploration.
artifact_contract_output_type: dimension-order
artifact_contract_required_data:
  - the dimensions of the pack in priority order
  - the dimensions kept for the decision
  - the dimensions pruned away
artifact_contract_verified_by: the covered dimensions follow the priority order of the pack and the pruned ones are named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/academic-lit.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/technical.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/user-voice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/research-a-decision.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Order the research dimensions and prune them to the decision
**Dimensions (priority order — prune to the decision):**
A type is a set of questions, source rules, and freshness windows that makes the research sharper than an unaided prompt.
**Explore** (the default) builds understanding. **Select** runs a structured choose-between when you are picking among candidates.
<!-- vpmodule:atom:end order-the-research-dimensions-and-prune-to-the-decision -->
<!-- vpmodule:atom:begin write-a-research-prompt-for-another-tool -->
---
instruction_id: write-a-research-prompt-for-another-tool
title: Write a research prompt for another tool
summary: "Hand the type's questions, the recency rules and the citation demand to the research tool the reader already pays for, and process the report that comes back."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: The reader already has a deep-research tool and the research has to run there.
conditions_does_not_apply_when: The research has to run in this session or reach internal sources.
artifact_contract_output_type: research-prompt
artifact_contract_required_data:
  - "the type's questions"
  - the recency rules
  - the citation demand
artifact_contract_verified_by: "the prompt carries the type's questions, the recency rules and the citation demand"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/research-a-decision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Write a research prompt for another tool
The prompt carries the type's questions, recency rules, and a citation demand, tuned to the tool you name.
Point it at any finished report (the one your tool just produced, an analyst PDF, a colleague's document).
Draft exists because most people already pay for a deep-research tool, and those products crawl widely.
<!-- vpmodule:atom:end write-a-research-prompt-for-another-tool -->