---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-negotiation-skill-md-04713fbf-c01"
title: "wondelai-skills: skills/negotiation/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/negotiation/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/negotiation/SKILL.md\"}"
atom_ids:
  - negotiation-accusation-audit
  - negotiation-ackerman
  - negotiation-black-swans
  - negotiation-calibrated-questions
  - negotiation-common-mistakes
  - negotiation-core
  - negotiation-labeling
  - negotiation-mirroring
atom_count: 8
atoms: "[{\"atom_id\":\"negotiation-accusation-audit\",\"file_sha256\":\"ef67c863e21e4a97aa21ee0d8780e2dcac082569c4ad4fa8cb24ca4c949a7d41\",\"content_sha256\":\"06d6b15e888dc4bc2c95c9343a3a4a0f4dfdf5ad23b33e368364d4810d2f2f56\",\"file_bytes\":1564,\"body_bytes\":408},{\"atom_id\":\"negotiation-ackerman\",\"file_sha256\":\"62da13dba845c03f52e1768b4e4692b87b5f227c56d4bf15b0d88979caecf146\",\"content_sha256\":\"ac53a6b2334e8964325583caaa2f6b21e080e8d657b2b3319fcd05aa2ac1a8bb\",\"file_bytes\":1451,\"body_bytes\":310},{\"atom_id\":\"negotiation-black-swans\",\"file_sha256\":\"d596d24c3f4dc52b3b663744105ea427ad3f5190715bad94d62305b6836aee7e\",\"content_sha256\":\"3d1ac1edd3b5607381050f99cdfc4fbecce36d1ae3c3384183142000182da35a\",\"file_bytes\":1731,\"body_bytes\":579},{\"atom_id\":\"negotiation-calibrated-questions\",\"file_sha256\":\"965d7cee075a7bd7862045103bc190a7506d62e3efcbdaae85c10dae4391b9d7\",\"content_sha256\":\"20bf60db674f5773c699d7541ab8a1314375b070d7584f811a32a43b9d558e19\",\"file_bytes\":1689,\"body_bytes\":533},{\"atom_id\":\"negotiation-common-mistakes\",\"file_sha256\":\"6bee75e25d7bd656645c7ee85da26d52767fe1e3ee21b455bbaede1c86cced2d\",\"content_sha256\":\"a6cb476bb14a3de971c2c1d1861d73d233acea16f4d96aba9ade8058771f4e0f\",\"file_bytes\":1737,\"body_bytes\":582},{\"atom_id\":\"negotiation-core\",\"file_sha256\":\"0a9b5988816cf70bc99fa2d5d260e1ececf2897cc21e5d98addb41a729068cfa\",\"content_sha256\":\"a695721500fde497fc9d4a4cc83535746008700b01c321e25e89c5415634cd6c\",\"file_bytes\":1642,\"body_bytes\":451},{\"atom_id\":\"negotiation-labeling\",\"file_sha256\":\"4be7f8e8caab4470e3b7d2682cba81348566766ef7d390055dd2d4122be8f2bc\",\"content_sha256\":\"2b57b18f8725cdc700520b7ab653382644921f7cea13aa346980b929969b3261\",\"file_bytes\":1503,\"body_bytes\":406},{\"atom_id\":\"negotiation-mirroring\",\"file_sha256\":\"7a3eb4780ae64a19e169fdb3dd494e1ba95e702b0de41c4568facedff6d6e5d4\",\"content_sha256\":\"80b5632706eac98b77b0099753f757fdc76c7868aae2751c80b14f7ce786992d\",\"file_bytes\":1415,\"body_bytes\":303}]"
carrier_sha256: 2d326953eba2dae337aa8ed8b3b5a81208e0883ffe47f8f615944d6d044398b0
carrier_bytes: 13569
revision: 1
status: active
---
<!-- vpmodule:atom:begin negotiation-accusation-audit -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-accusation-audit
title: Run an accusation audit
summary: "Before negotiating, list every negative the counterpart may think and deliver the audit early, intentionally overshooting so the list sounds slightly worse than what they actually think."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - accusation-audit
conditions_applies_when: Preparing for a tense or low-leverage conversation.
conditions_does_not_apply_when: A negotiation with no anticipated objection.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The audit lists the anticipated negatives and is delivered before objections surface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L130-L154"
status: active
revision: 1
---

# Run an accusation audit

Before negotiating, identify and preemptively verbalize every negative thing the counterpart might think or say about you. Brainstorm these negatives before the meeting and deliver the audit early, before objections surface. Intentionally overshoot so the list sounds slightly worse than what they actually think. The practice is particularly powerful when you have less leverage.
<!-- vpmodule:atom:end negotiation-accusation-audit -->
<!-- vpmodule:atom:begin negotiation-ackerman -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-ackerman
title: Use Ackerman bargaining
summary: "Set a target, then offer 65%, 85%, 95% and 100% in decreasing increments, use a precise non-round final number, attach a non-monetary bonus and never concede without a return."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - ackerman-bargaining
conditions_applies_when: A monetary or terms negotiation with room for offers.
conditions_does_not_apply_when: A single fixed price with no counteroffer.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The offers follow the stated percentages and the final number is precise with a bonus.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L182-L208"
status: active
revision: 1
---

# Use Ackerman bargaining

For monetary bargaining, set a target first, then make offers at 65%, 85%, 95%, and 100% of that target in decreasing increments. Use a precise, non-round final number and attach a non-monetary bonus to the final offer. Never make a concession without receiving something in return.
<!-- vpmodule:atom:end negotiation-ackerman -->
<!-- vpmodule:atom:begin negotiation-black-swans -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-black-swans
title: Hunt for Black Swans
summary: "Hunt for about three hidden constraints, motivations or context; watch anomalies and unguarded moments, diagnose apparent irrationality and use positive, negative and normative leverage to surface what is hidden."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - black-swan
conditions_applies_when: A stalled or puzzling negotiation.
conditions_does_not_apply_when: A fully transparent negotiation with no hidden information.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: At least one hidden factor is named with the evidence that surfaced it.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L209-L235"
status: active
revision: 1
---

# Hunt for Black Swans

Hunt for approximately three hidden, game-changing pieces of information in every negotiation. Consider all three types: secret constraints, hidden motivations, and unknown context. Watch for anomalies, hesitations, and inconsistencies; listen in unguarded moments before and after meetings. If the counterpart seems irrational, diagnose whether they are ill-informed, constrained, or hiding something. Use positive leverage (what they want), negative leverage (what they fear), and normative leverage (their stated values) to surface hidden information.
<!-- vpmodule:atom:end negotiation-black-swans -->
<!-- vpmodule:atom:begin negotiation-calibrated-questions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-calibrated-questions
title: Ask calibrated questions
summary: "Use open How and What questions to steer while giving the counterpart control; avoid Why except to invite defense of something favorable, keep the tone collaborative and follow every yes with How."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - calibrated-question
conditions_applies_when: Pushing back or uncovering constraints without refusing.
conditions_does_not_apply_when: A yes-or-no administrative question.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each question starts with How or What and has a collaborative purpose.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L102-L129"
status: active
revision: 1
---

# Ask calibrated questions

Use open-ended “How…?” and “What…?” questions to guide the conversation while letting the counterpart feel in control. Start with “How” or “What” and avoid “Why” because it can sound accusatory, except when you want the counterpart to defend something favorable to you. Keep the tone genuinely collaborative, never sarcastic. “How am I supposed to do that?” is a strong pushback without saying no. Follow every “yes” with “How…?” to secure implementation commitment.
<!-- vpmodule:atom:end negotiation-calibrated-questions -->
<!-- vpmodule:atom:begin negotiation-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-common-mistakes
title: Avoid the listed negotiation mistakes
summary: "Avoid splitting the difference, pushing for yes, arguing your position, skipping the accusation audit, countering an extreme anchor, using Why and treating 'you're right' as success; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a negotiation plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L262-L273"
status: active
revision: 1
---

# Avoid the listed negotiation mistakes

Avoid splitting the difference; hold firm because no deal is better than a bad deal. Do not push for “yes”; pursue “That’s right” and let the counterpart say “No” first. Do not argue your position; use calibrated questions and labels. Prepare and deliver an accusation audit early. Do not immediately counter an extreme anchor; mirror, label, and ask how they arrived at it. Replace “Why?” with “What” and “How” questions. Do not treat “You’re right” as success; continue working toward “That’s right.”
<!-- vpmodule:atom:end negotiation-common-mistakes -->
<!-- vpmodule:atom:begin negotiation-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-core
title: Negotiate through empathy and discovery
summary: "Treat negotiation as discovery grounded in empathy and emotional intelligence; make the counterpart feel understood and safe, test assumptions, respect their needs and never split the difference because no deal is better than a bad deal."
capability_tags: []
pattern_tags: []
conditions_applies_when: Any negotiation or high-stakes conversation.
conditions_does_not_apply_when: A routine transaction with no relationship or terms to negotiate.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The plan names the counterpart's needs and a walk-away alternative, and rejects a bad deal."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L14-L17"
status: active
revision: 1
---

# Negotiate through empathy and discovery

Treat negotiation as a discovery process grounded in empathy, active listening, and emotional intelligence. Work to help the counterpart feel understood and safe; test assumptions as hypotheses; attend to their needs for respect, security, and autonomy beyond stated positions. Understand their position without giving up advocacy for your own. Never split the difference: no deal is better than a bad deal.
<!-- vpmodule:atom:end negotiation-core -->
<!-- vpmodule:atom:begin negotiation-labeling -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-labeling
title: Label emotions tentatively
summary: "Name the counterpart's emotion or perspective with neutral third-person phrases, never 'I think you', then stay silent; treat a wrong label as useful correction."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - emotion-labeling
conditions_applies_when: A counterpart showing emotion or resistance.
conditions_does_not_apply_when: A factual exchange with no emotional signal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The label uses third-person phrasing and is followed by silence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L77-L101"
status: active
revision: 1
---

# Label emotions tentatively

Identify and verbalize the counterpart’s emotions or perspective using neutral, tentative third-person phrases such as “It seems like,” “It sounds like,” or “It looks like”; do not say “I think you…”. After labeling, be silent. A wrong label can still yield useful information through correction. Watch for emotional shifts that may show the label landed.
<!-- vpmodule:atom:end negotiation-labeling -->
<!-- vpmodule:atom:begin negotiation-mirroring -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-mirroring
title: Mirror to invite elaboration
summary: "Repeat the counterpart's last one to three critical words with a curious upward inflection, then stay silent for at least four seconds to let them expand."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - mirroring-words
conditions_applies_when: Gathering information or slowing a fast conversation.
conditions_does_not_apply_when: A written exchange where repetition would read as mockery.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The mirror uses one to three words and is followed by silence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L52-L76"
status: active
revision: 1
---

# Mirror to invite elaboration

Repeat the counterpart’s last 1–3 critical words with a curious, upward-inflecting tone, then stay silent for at least 4 seconds to invite elaboration. Reflect key or emotion-laden words as a gentle question. Mirroring can be used in person, by phone, or in writing.
<!-- vpmodule:atom:end negotiation-mirroring -->