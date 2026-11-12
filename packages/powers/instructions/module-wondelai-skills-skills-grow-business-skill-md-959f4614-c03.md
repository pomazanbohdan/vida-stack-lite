---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-grow-business-skill-md-959f4614-c03"
title: "wondelai-skills: skills/grow-business/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/grow-business/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/grow-business/SKILL.md\"}"
atom_ids:
  - grow-business-phases
  - grow-business-word-of-mouth
atom_count: 2
atoms: "[{\"atom_id\":\"grow-business-phases\",\"file_sha256\":\"d0b598bd8984ada700e5bf31946a74ec3d773115b8090c806cd986ed7e819b68\",\"content_sha256\":\"e3cd9308ac1c9c384eacbb332a8a16f628b6fd437d688ed9b333d26d0c3ed360\",\"file_bytes\":1307,\"body_bytes\":201},{\"atom_id\":\"grow-business-word-of-mouth\",\"file_sha256\":\"8450b4f715729d1ea5ff3540410569cd246cb321fe1774b461b0cfba4c822dd8\",\"content_sha256\":\"917cad5347ccdbe79d1ac8e7a715f86b707ec33a0b4956b34397af35a5e22992\",\"file_bytes\":1814,\"body_bytes\":675}]"
carrier_sha256: 475c0ab8313fb94b0d6f512faab5575919c8818db92c7582dbb85287b667cebc
carrier_bytes: 3330
revision: 1
status: active
---
<!-- vpmodule:atom:begin grow-business-phases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-business-phases
title: Run phases in order
summary: "Run phases in order unless intake reorders them; each phase reads earlier docs and, when an upstream phase was skipped, uses intake facts and flags the missing input rather than inventing it."
capability_tags:
  - build-growth-engine
pattern_tags: []
conditions_applies_when: Entering any phase.
conditions_does_not_apply_when: A phase whose upstream input is missing without a flag.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The order is preserved or reordered by intake, and missing inputs are flagged."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-business/SKILL.md; sha256=114d4477a4d53234d3d58a4142a156bc55406137105f733ff6b9213236f762e7; locator=skills/grow-business/SKILL.md#L65-L68"
status: active
revision: 1
---

# Run phases in order

Run phases in order unless intake reorders them. A phase reads earlier docs; when an upstream phase was skipped, use intake facts and flag missing input instead of inventing it.
<!-- vpmodule:atom:end grow-business-phases -->
<!-- vpmodule:atom:begin grow-business-word-of-mouth -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-business-word-of-mouth
title: Engineer word-of-mouth
summary: "Audit STEPPS, strengthen one or two levers, engineer at least one Trigger and a brand-embedded story that passes the retell test, remembering that only about 7% of word-of-mouth is online."
capability_tags:
  - build-growth-engine
pattern_tags:
  - word-of-mouth-shareability
conditions_applies_when: Designing referrals into a feature or campaign.
conditions_does_not_apply_when: A product with no shareable asset.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The STEPPS table has an engineered Trigger and a retell-tested story.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-business/SKILL.md; sha256=114d4477a4d53234d3d58a4142a156bc55406137105f733ff6b9213236f762e7; locator=skills/grow-business/SKILL.md#L111-L124"
status: active
revision: 1
---

# Engineer word-of-mouth

Phase 4 deliberately engineers Seeds by designing shareability into a feature or campaign. Audit STEPPS: Social Currency, Triggers, high-arousal Emotion (awe, anger, excitement; contentment suppresses sharing), Public visibility, Practical Value, and Stories with brand embedded. Only about 7% of word-of-mouth is online. A story that survives retelling without the brand fails the Trojan Horse test. Triggers and Practical Value are usually highest leverage for an existing business. Ask which asset and one or two levers to strengthen; record a STEPPS table with at least one engineered Trigger and a brand-embedded story that passes retell test.
<!-- vpmodule:atom:end grow-business-word-of-mouth -->