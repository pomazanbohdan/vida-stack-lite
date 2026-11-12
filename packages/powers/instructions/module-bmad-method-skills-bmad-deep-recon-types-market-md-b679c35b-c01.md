---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-types-market-md-b679c35b-c01"
title: "bmad-method: skills/bmad-deep-recon/types/market.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-deep-recon/types/market.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/types/market.md\"}"
atom_ids:
  - size-a-market-before-entering-it
  - treat-a-persistent-complaint-pattern-as-stronger
atom_count: 2
atoms: "[{\"atom_id\":\"size-a-market-before-entering-it\",\"file_sha256\":\"301ffa2de0d782cf34e4c23648e2c51cc60e0688060de9bc6b5ff665f07a4039\",\"content_sha256\":\"31d5bbee3340c58766f35c65daeeb7b6f7f924515cf0508d42f50f50783fccdd\",\"file_bytes\":1836,\"body_bytes\":559},{\"atom_id\":\"treat-a-persistent-complaint-pattern-as-stronger\",\"file_sha256\":\"1c933cf25fb28c20d9680c020073f34b6b60b06a9862236564e3fc7c6e39afe9\",\"content_sha256\":\"4f2c9699ac5d34945f85321f032b677578087482825de7f3c7bab7986f4ee21b\",\"file_bytes\":1215,\"body_bytes\":146}]"
carrier_sha256: e2a7023fe7b8b84a0a743759a3f08b3197676c942bbd44aeb0a740ec209ee3ec
carrier_bytes: 3326
revision: 1
status: active
---
<!-- vpmodule:atom:begin size-a-market-before-entering-it -->
---
instruction_id: size-a-market-before-entering-it
title: Size a market before entering it
summary: "Decide whether to enter or skip a market, position a product, pick a segment or price an offer: size the reachable market, the segments, the pains, the competitors for the budget and the go-to-market motion."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: "A decision is about to enter, skip, segment or price in a market."
conditions_does_not_apply_when: The decision is about one named competitor; that is the competitive pack.
artifact_contract_output_type: research-pack
artifact_contract_required_data:
  - the decision the study serves
  - the five dimensions in priority order
  - the reachable market rather than the headline TAM
artifact_contract_verified_by: the study answers every dimension of the pack in the pack priority order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - business
  - product
  - research
---

# Size a market before entering it
Serves: enter or skip a market, position a product, pick a segment, price an offer, pitch investors.

1. Market size & growth — the *reachable* market, not the headline TAM
2. Customer segments & behavior — who buys, deciding how, valuing what
3. Pain points & unmet needs — what they complain about, work around, pay to avoid
4. Competitive landscape — who competes for this budget, including substitutes and "do nothing"
5. GTM & pricing dynamics — channels, sales motion, accepted pricing models, realistic CAC
<!-- vpmodule:atom:end size-a-market-before-entering-it -->
<!-- vpmodule:atom:begin treat-a-persistent-complaint-pattern-as-stronger -->
---
instruction_id: treat-a-persistent-complaint-pattern-as-stronger
title: Treat a complaint pattern that persists as stronger evidence
summary: "A complaint pattern that persists across years is a stronger finding, not a stale one."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A complaint has been reported over a long period.
conditions_does_not_apply_when: "The complaint was fixed in the current version, or the pattern is recent."
artifact_contract_output_type: pattern-evidence
artifact_contract_required_data:
  - the complaint pattern
  - the period it persists over
artifact_contract_verified_by: the period the pattern persists over is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/types/market.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Treat a complaint pattern that persists as stronger evidence
a complaint pattern persisting across years is a stronger finding, not a stale one
<!-- vpmodule:atom:end treat-a-persistent-complaint-pattern-as-stronger -->