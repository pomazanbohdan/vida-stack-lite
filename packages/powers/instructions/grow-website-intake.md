---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-intake
title: Run intake before the tracker
summary: "Ask about the site and conversion action, traffic and conversion numbers, existing visitor research, lead capture, offer and price, existing positioning and monthly volume; apply the skip rules and confirm the tracker."
capability_tags:
  - design-website-growth
pattern_tags:
  - resumable-journey
conditions_applies_when: First start with no grow-website tracker.
conditions_does_not_apply_when: A resumed journey that already has a tracker.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every intake question is answered, the skip rules are applied and the tracker is confirmed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L42-L57"
status: active
revision: 1
---

# Run intake before the tracker

Before creating the tracker the agent must ask seven intake questions: (1) what the site is and its primary conversion action (signup, purchase, booking, lead form) — anchors every phase and defines where the funnel ends; (2) what traffic and conversion numbers exist (sessions, bounce rate, conversion rate, worst-performing high-traffic page) — gates Phase 1's funnel map and whether A/B testing can reach significance; (3) what visitor research already exists (exit surveys, support tickets, chat logs, reviews) — raw material for the O/CO table, and if none exists Phase 1 starts by gathering it; (4) whether leads are already captured (list, lead magnet) and how well it converts — gates Phase 2; (5) what is being sold, at what price, and whether visitors call it 'too expensive' — gates Phase 6's offer rebuild; (6) whether existing positioning or messaging exists (POSITIONING.md, brand script, one-liner) — gates Phases 3-4 and must be reused rather than redone; (7) monthly traffic volume — decides Phase 1's testing approach: enough for bold A/B tests to reach significance, or lean on qualitative research and reason from principles. Skip heuristics: skip Phase 2 when a lead-capture funnel already converts well; skip Phases 3-4 when a stranger already passes the five-second test on the message; skip Phase 6 when the offer converts and price is not an objection; skip Phase 7 when there is no naturally shareable asset and referral is not a realistic channel. Then create docs/GROW-WEBSITE-PLAN.md from the template and confirm the plan; done when the tracker exists with every phase statused and the user confirmed.
