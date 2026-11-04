---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-scorecard
title: Capture the not-ready visitors
summary: "Build a scorecard with a clarity, credibility and connection landing page, email capture before question one, 8-15 scored questions in 2-7 categories, dynamic tiered results and score-segmented follow-up."
capability_tags:
  - design-website-growth
pattern_tags:
  - scorecard-questionnaire
conditions_applies_when: Most visitors are not ready to buy today.
conditions_does_not_apply_when: An existing lead-capture funnel that already converts well.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Email is captured first, tiers are dynamic and each tier has its own follow-up track."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L78-L95"
status: active
revision: 1
---

# Capture the not-ready visitors

Phase 2 (scorecard-marketing) — capture the 97% who are not ready to buy. Purpose: keep visitors who will not buy today with an interactive assessment instead of losing them at exit. Fallback brief: about 3% of a market is ready now; capture the rest — a scorecard or quiz converts 30-50% versus 3-10% for a PDF. Four steps: a landing page built on the 3 Cs (Clarity, Credibility, Connection); a questionnaire that captures the email before the questions, then 8-15 scored questions in 2-7 categories; a results page with dynamic content per tier that creates tension between where the visitor is and could be; a follow-up engine segmented by score. Invoke: run the scorecard-marketing skill with the audience and primary conversion action, asking for the concept hook (pressure-tested across several options), the scored questions and their categories, the tiered results copy, the pre-question capture form, and tier-segmented follow-up emails. Decide with the user: (1) the concept hook — pick a 'moving toward' framing that taps the strongest dormant desire over a fear-based one; (2) how many tiers and where the score cutoffs sit; (3) whether an adequate capture funnel already exists, in which case skip. Artifact: extend docs/WEBSITE.md '## Lead Capture' (scorecard funnel design: hook, questions, tiers, capture-first form) and docs/MARKETING.md '## Nurture Sequences' (tier-segmented follow-up tracks); update the tracker. Done when: WEBSITE.md documents a scorecard that captures email before question one with dynamic results by tier, and MARKETING.md holds a separate follow-up track for each tier.
