---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-grow-website-skill-md-9181fcf9-c01"
title: "wondelai-skills: skills/grow-website/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/grow-website/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/grow-website/SKILL.md\"}"
atom_ids:
  - grow-website-apply
  - grow-website-common-mistakes
  - grow-website-complete
  - grow-website-core
  - grow-website-intake
  - grow-website-journey-map
  - grow-website-lifecycle
  - grow-website-message
atom_count: 8
atoms: "[{\"atom_id\":\"grow-website-apply\",\"file_sha256\":\"13df370e275626a91ed0591fd88ca3e549f2d188c981b3cd6e565b1b862deab4\",\"content_sha256\":\"2c915948c5ef2eeb5389373e88f1efd6b31d6598c86a99048e2d86d9ad346c13\",\"file_bytes\":1716,\"body_bytes\":515},{\"atom_id\":\"grow-website-common-mistakes\",\"file_sha256\":\"8316f8f0a2d9969439dfef1866151525c66128a686305c68463bcdf4065a1d68\",\"content_sha256\":\"2ba898e318716046e9756ae8834c6bd6d3ba9d3237f19db73da18e4841afa954\",\"file_bytes\":2281,\"body_bytes\":1120},{\"atom_id\":\"grow-website-complete\",\"file_sha256\":\"cc8c1f7862ffc387729e4037fe2a43883d996cf9641e1399d3f7b1614b9a5c5c\",\"content_sha256\":\"0b0f7970d5ccec291e8da9ac629ff6892879648ded5f8f00804b4f6e8bf918db\",\"file_bytes\":2068,\"body_bytes\":955},{\"atom_id\":\"grow-website-core\",\"file_sha256\":\"0d2a456040e823a0a5f7aaac94682755a51d456e4dd3c7573082c39713485930\",\"content_sha256\":\"552f42e4d892c8d6d5d40aa162c849d5a34f72200659e3e61f6a036157f1d7b8\",\"file_bytes\":1624,\"body_bytes\":477},{\"atom_id\":\"grow-website-intake\",\"file_sha256\":\"15e103222cc49e794ee2c7a14c5e5b05b8af0a5f94e739db25eb4dd2098d0ea9\",\"content_sha256\":\"0ed30bb390097d35e8871d64af7f8e011ccaf5abaa0771ca98b39860673d8f4a\",\"file_bytes\":2865,\"body_bytes\":1679},{\"atom_id\":\"grow-website-journey-map\",\"file_sha256\":\"7eebe5e37f0bbced5fd900f7e7c79d43795baf02cfcbeb34b3143af0a2a1c1ea\",\"content_sha256\":\"cd6de2fd27542b692861907c3cc16809ac82ddf7cc66efc2728f23283bee9956\",\"file_bytes\":2198,\"body_bytes\":1137},{\"atom_id\":\"grow-website-lifecycle\",\"file_sha256\":\"03e4d24c7afcd9be8eea3bdcbb48ccae79c8b751a12ae399f903002e0883db69\",\"content_sha256\":\"54f9e8521ca6b0bdfca0e469b6733b1509f9996b2a1fc3e5454b16cf59628f9a\",\"file_bytes\":2643,\"body_bytes\":1524},{\"atom_id\":\"grow-website-message\",\"file_sha256\":\"62377b72014cea99ecdaee517d3b8f59eb782b090195f425bcb2d8ee9eed3b18\",\"content_sha256\":\"763c39606039d8de1bd905f0cf36b7b6302292d7fb30aad3c49281f771c0a7c1\",\"file_bytes\":2627,\"body_bytes\":1465}]"
carrier_sha256: 8d58fd0be230048fb88537135c879550837145c1171b11925d70709f4d8f2c20
carrier_bytes: 18823
revision: 1
status: active
---
<!-- vpmodule:atom:begin grow-website-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-apply
title: Run the website-growth journey
summary: "Take a site with traffic it under-monetizes and run eight research-driven phases for leads, buyers, a sharper offer and referrals; ask before each fork, keep state in docs and resume across sessions."
capability_tags:
  - design-website-growth
pattern_tags:
  - traffic-conversion
  - resumable-journey
conditions_applies_when: A site that already has traffic but under-converts.
conditions_does_not_apply_when: A site with no traffic or a broken funnel that needs improve-website.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The journey names the eight phases and the docs that record decisions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L10-L13"
status: active
revision: 1
---

# Run the website-growth journey

This skill takes a site that already has traffic but under-monetizes it and turns it into a research-driven growth engine: more leads captured, more buyers persuaded, a sharper offer, and visitors who bring more visitors. It runs eight phases in which the agent asks the user before deciding at every fork, and all state lives in the project's docs/ folder so the journey can be stopped and resumed across sessions. It sequences the work and does not redesign the site on a hunch.
<!-- vpmodule:atom:end grow-website-apply -->
<!-- vpmodule:atom:begin grow-website-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-common-mistakes
title: Avoid the listed website-growth mistakes
summary: "Avoid optimizing before research, testing meek tweaks, capturing email after the quiz, faking scarcity or proof, polishing the page while ignoring the offer and ignoring the AFTER phase; apply each fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a website-growth plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L217-L227"
status: active
revision: 1
---

# Avoid the listed website-growth mistakes

Common Mistakes are cross-journey guardrails with required fixes. Do not optimize before researching: run cro-methodology visitor research first and change only what evidence flags rather than what a meeting brainstormed. Do not test meek tweaks such as button colors: queue bold changes such as a new offer, value proposition, or full-page rewrite, ICE-score them, and run each to significance over a full business cycle. Do not capture email after the quiz: fire the lead form before question one so an abandoned assessment still leaves a recoverable lead. Do not fake scarcity or proof: use only true numbers, deadlines, and testimonials because one fake claim poisons every honest claim after it. Do not polish the page while ignoring the offer: rebuild the offer upstream with hundred-million-offers before more page tests and treat too expensive as usually a value-perception problem. Do not ignore the AFTER phase: fill the empty Experience, Lifetime Value, and Referrals squares with one-page-marketing because retention and referral are the cheapest growth there is.
<!-- vpmodule:atom:end grow-website-common-mistakes -->
<!-- vpmodule:atom:begin grow-website-complete -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-complete
title: Close or route the journey
summary: "Verify the O/CO table, scorecard capture, Grand Slam offer, filled AFTER grid and one running bold experiment; close the tracker with every phase done or skipped and route to grow-app or create-website."
capability_tags:
  - design-website-growth
pattern_tags: []
conditions_applies_when: Closing a grow-website journey.
conditions_does_not_apply_when: A journey still in its first phases.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every exit-check item is tied to an artifact and the next route is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L228-L242"
status: active
revision: 1
---

# Close or route the journey

Complete the journey only when the exit checklist is satisfied: WEBSITE.md has an O/CO table with each counter placed at its point of friction and audit findings resolved or queued; a scorecard captures email before the questions and tier-segmented follow-up is recorded in MARKETING.md; OFFER.md holds a Grand Slam Offer with value equation, named bonuses, and real guarantee queued as a bold experiment in EXPERIMENTS.md; MARKETING.md's Before/During/After grid has no empty AFTER squares for Experience, Lifetime Value, and Referrals; and at least one bold experiment is running to significance with pre-committed metrics. Then close the tracker by marking every phase done or skipped with a reason and carrying any open Next Actions into the artifacts they belong to. Route forward to grow-app when the growth loops belong inside the product, or to create-website when the site is beyond saving and a rebuild is cheaper.
<!-- vpmodule:atom:end grow-website-complete -->
<!-- vpmodule:atom:begin grow-website-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-core
title: Convert existing traffic first
summary: "Treat most traffic problems as conversion problems: capture and convert visitors already present before buying more, and keep research before optimization and the offer before page polish."
capability_tags:
  - design-website-growth
pattern_tags:
  - traffic-conversion
conditions_applies_when: A site deciding whether to buy traffic or fix conversion.
conditions_does_not_apply_when: A site with no traffic to convert.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan sequences research and offer work before traffic spend or page polish.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L14-L17"
status: active
revision: 1
---

# Convert existing traffic first

Core principle: most traffic problems are conversion problems in costume — capture and convert the visitors you already have before buying more traffic. The skill sequences the phases, asks the decision questions, and records every choice in docs/. The constituent skills carry the method and must be invoked rather than having their frameworks improvised. Research comes before optimization, and the offer comes before page polish, always.
<!-- vpmodule:atom:end grow-website-core -->
<!-- vpmodule:atom:begin grow-website-intake -->
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
<!-- vpmodule:atom:end grow-website-intake -->
<!-- vpmodule:atom:begin grow-website-journey-map -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-journey-map
title: Use the eight-phase journey map
summary: "Run the eight phases in order, each bound to its skill, question and docs artifacts, from conversion research through the lifecycle audit."
capability_tags:
  - design-website-growth
pattern_tags: []
conditions_applies_when: Planning which phase produces which artifact.
conditions_does_not_apply_when: A request for one framework in isolation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every phase names its skill, question and target artifact."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L18-L30"
status: active
revision: 1
---

# Use the eight-phase journey map

The journey is fixed as eight ordered phases, each bound to a constituent skill, the question it answers, and the docs/ artifacts it extends: (1) cro-methodology — why visitors do not convert and what is worth testing — extends docs/WEBSITE.md, docs/METRICS.md, docs/EXPERIMENTS.md; (2) scorecard-marketing — how to keep leads not ready to buy — extends docs/WEBSITE.md, docs/MARKETING.md; (3) storybrand-messaging — whether a stranger can tell what is offered in five seconds — extends docs/POSITIONING.md; (4) made-to-stick — whether the message will be remembered when the visitor is ready — extends docs/POSITIONING.md, docs/WEBSITE.md; (5) influence-psychology — why visitors should believe and act now — extends docs/WEBSITE.md; (6) hundred-million-offers — whether the offer is irresistible — extends docs/OFFER.md, docs/EXPERIMENTS.md; (7) contagious — whether visitors will bring more visitors — extends docs/MARKETING.md, docs/WEBSITE.md; (8) one-page-marketing — whether the wins link into one compounding engine — extends docs/MARKETING.md, docs/METRICS.md.
<!-- vpmodule:atom:end grow-website-journey-map -->
<!-- vpmodule:atom:begin grow-website-lifecycle -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-lifecycle
title: Tie the lifecycle together
summary: "Audit the 3x3 Before, During and After grid, score all nine squares, fill empty AFTER squares, add a 3:1 value-to-ask nurture sequence and record retention and LTV targets."
capability_tags:
  - design-website-growth
pattern_tags:
  - marketing-machine
conditions_applies_when: "Connecting acquisition, nurture, conversion and referral."
conditions_does_not_apply_when: A single disconnected tactic.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: No AFTER square is empty and retention and LTV targets are recorded.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L188-L205"
status: active
revision: 1
---

# Tie the lifecycle together

Phase 8 (one-page-marketing) — tie the lifecycle together so wins compound. Purpose: connect acquisition, nurture, conversion, and referral into one engine so wins do not leak out the back. Fallback brief: marketing is a process, not an event; the 3x3 grid — BEFORE (Target Market, Message, Media), DURING (Capture Leads, Nurture, Convert), AFTER (Experience, Lifetime Value, Referrals); the AFTER column is usually where the money hides — retention costs 5-25x less than acquisition, and a 5% retention gain lifts profit 25-95%; the number-one reason customers do not refer is that nobody asked. Invoke: run the one-page-marketing skill as an audit tying Phases 1-7 together — the scorecard fills Capture, the offer fills Convert, Contagious powers Referrals — asking for the 9-square plan scored 0-10 per square, flagging empty AFTER squares, and a lead-nurture sequence at a 3-to-1 value-to-ask ratio. Decide with the user: (1) which empty squares to fill first — usually Experience, Lifetime Value, Referrals; (2) the ascension model for best customers; (3) retention and LTV targets to track. Artifact: extend docs/MARKETING.md '## Target Market & Avatar', '## Before / During / After Grid', '## Referral & Invite Mechanics', and '## Nurture Sequences'; extend docs/METRICS.md '## Baselines & Targets' (retention, LTV); update the tracker. Done when: MARKETING.md's Before/During/After grid has no empty AFTER squares, and retention and LTV targets are recorded in METRICS.md.
<!-- vpmodule:atom:end grow-website-lifecycle -->
<!-- vpmodule:atom:begin grow-website-message -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-message
title: Make the message clear
summary: "Make the customer the hero and the brand the guide, run SB7 with a three-level problem and a 3-4 step plan, and choose a one-liner a stranger can repeat after seeing it once."
capability_tags:
  - design-website-growth
pattern_tags:
  - message-framework
conditions_applies_when: A stranger cannot tell what the site offers in five seconds.
conditions_does_not_apply_when: A message already passing the five-second test.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The brand script is complete, the one-liner is chosen and the hero passes the five-second test."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L96-L113"
status: active
revision: 1
---

# Make the message clear

Phase 3 (storybrand-messaging) — make the message clear before clever. Purpose: ensure a stranger can tell what the business does, for whom, and why to care within five seconds. Fallback brief: make the customer the hero and the brand the guide (Yoda, not Luke); run SB7 — a Character who wants one thing; a Problem named at three levels (external, internal, philosophical — sell to the internal); a Guide with empathy and authority; a 3-4 step Plan; a direct and repeated Call to Action; the stakes of Failure; a picture of Success; produce a one-liner of the form 'We help [character] who struggle with [problem] to [solution] so they can [result]'; clear beats clever. Invoke: run the storybrand-messaging skill with the objections and proof inventory from Phase 1 (raw material for the Problem and the Guide's authority) plus any existing positioning, asking for a full brand script, a homepage hero rewrite, and 2-3 one-liner options. Decide with the user: (1) which internal problem to lead with; (2) which one-liner a stranger could repeat after hearing it once; (3) the direct plus transitional CTA wording. Artifact: extend docs/POSITIONING.md '## Brand Script (StoryBrand)', '## One-Liner', and '## Key Messages' (surface | message | status); update the tracker. Done when: POSITIONING.md holds a completed brand script, a chosen one-liner, and key messages mapped to surfaces — and the hero passes the five-second test.
<!-- vpmodule:atom:end grow-website-message -->