---
instruction_id: set-a-freshness-bar-for-each-class-of-claim
title: Set a freshness bar for each class of claim
summary: Each research pack sets a maximum age per class of claim; a source older than its bar no longer supports the claim it was cited for.
capability_tags:
  - research-primary-sources
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A research claim is about to be carried by a source.
conditions_does_not_apply_when: "The claim is about seminal work; it has no freshness bar, but check whether it was since superseded."
artifact_contract_output_type: freshness-bars
artifact_contract_required_data:
  - "the freshness bar of each research pack: academic literature, competitive, domain, market, technical, user voice"
  - the claim class each bar applies to
artifact_contract_verified_by: every class of claim has one stated bar and every cited source sits inside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/competitive.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/domain.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/market.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/technical.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/user-voice.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
  - research
---

# Set a freshness bar for each class of claim
Freshness: state-of-the-art claims ≤ 12 mo (ML ≤ 6 mo) · seminal work has no freshness bar — but check whether it was since superseded.
Freshness: pricing & features ≤ 3 mo · trajectory signals ≤ 6 mo · customer sentiment ≤ 12 mo.
Freshness: structure ≤ 3 yr · player landscape ≤ 18 mo · regulatory status: verify current on every load-bearing claim, whatever its date · tech adoption ≤ 18 mo, AI-adoption claims ≤ 6 mo.
Freshness: size/growth ≤ 18 mo · pricing & feature claims ≤ 3 mo · behavior data ≤ 2 yr · GTM benchmarks ≤ 12 mo.
Freshness: versions & compatibility ≤ 1 mo · ecosystem signals ≤ 6 mo · landscape ≤ 12 mo (AI-adjacent ≤ 3 mo) · patterns ≤ 2 yr.
Freshness: sentiment ≤ 18 mo · complaints re-checked against the current version before citing.
