---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-negotiation-skill-md-04713fbf-c02"
title: "wondelai-skills: skills/negotiation/SKILL.md module"
summary: "Carrier for 7 atomic instructions from wondelai-skills:skills/negotiation/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/negotiation/SKILL.md\"}"
atom_ids:
  - negotiation-quick-diagnostic
  - negotiation-score
  - negotiation-situations
  - negotiation-styles
  - negotiation-tactical-empathy
  - negotiation-thats-right
  - negotiation-voice
atom_count: 7
atoms: "[{\"atom_id\":\"negotiation-quick-diagnostic\",\"file_sha256\":\"c6e3980c2ad06be842ee3f01d26705b343e854659193f113690d2c3847199a57\",\"content_sha256\":\"7cc69d95de3fccd4ee6b27eb27c1e7d42818f5970abb7a0c556f4a8b56865701\",\"file_bytes\":1683,\"body_bytes\":502},{\"atom_id\":\"negotiation-score\",\"file_sha256\":\"c3057feff0d34dfc276da06a3a78d70d9bbaa24074f1ab3c69c317b273fa6ab7\",\"content_sha256\":\"379fa069442c65f15fc19ae04cbad73ee6daef73c16dccf3021fd0f7de978733\",\"file_bytes\":1756,\"body_bytes\":637},{\"atom_id\":\"negotiation-situations\",\"file_sha256\":\"bb96743eb90f0d6f6b54689dc49526f6f21417bf4a877f9fcbd4c3397670c84a\",\"content_sha256\":\"3fc8519acf65dc9cd4914c2e68f0f2165fede0d57f254c09e2a9732264a5cb51\",\"file_bytes\":1677,\"body_bytes\":480},{\"atom_id\":\"negotiation-styles\",\"file_sha256\":\"f964ca85c3e0938c428f638bbe92469e741a0412f4e554c4eaa2872f30a2711c\",\"content_sha256\":\"1f6370ff657edfe42b93697674967de599211726a108f1b88621c60151e8c501\",\"file_bytes\":1431,\"body_bytes\":308},{\"atom_id\":\"negotiation-tactical-empathy\",\"file_sha256\":\"3265838808c3e0560ee29b33b0b4fc845b71d2041b80cbacd73868c65f033d95\",\"content_sha256\":\"66c9807db43da090f181657ee14be1a98c4aa2dd38568f41e9f6e1b52a480fad\",\"file_bytes\":1519,\"body_bytes\":389},{\"atom_id\":\"negotiation-thats-right\",\"file_sha256\":\"e28648c754ea1c39ce2050568848f63aeaa2dcc4b8c1b470562130b709e665a4\",\"content_sha256\":\"26f7c8b5be3fc3890ed2ff12348355cd9ce1c83af044b8c450d766cda009b7bb\",\"file_bytes\":1618,\"body_bytes\":427},{\"atom_id\":\"negotiation-voice\",\"file_sha256\":\"adf591fc0e4fc3a0520ca04e4441d0855a4af104bd3884412f0fc1b56d437ec6\",\"content_sha256\":\"e384bc172cc2544eceb362f35e28f356edefd05cba6fd0306d3116dad5b93901\",\"file_bytes\":1479,\"body_bytes\":323}]"
carrier_sha256: 73e8bd45276b24ca32d175eb006b0f696b401badc598e87d5e3f682614f717b9
carrier_bytes: 11874
revision: 1
status: active
---
<!-- vpmodule:atom:begin negotiation-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-quick-diagnostic
title: Run the negotiation diagnostic
summary: "Check the accusation audit, 3-5 calibrated questions, BATNA, 'that's right' aim, counterpart style and Black Swan hunt; apply the listed action for every failed answer."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of negotiation preparation.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L274-L284"
status: active
revision: 1
---

# Run the negotiation diagnostic

Before negotiating, prepare an accusation audit; prepare 3–5 calibrated questions; identify your BATNA and walk-away point; aim for “That’s right” by summarizing until the counterpart genuinely affirms; consider whether their style is Analyst, Accommodator, or Assertive; and hunt for Black Swans by staying curious, watching anomalies, and asking about the unexpected. If any diagnostic answer is no, take the corresponding action specified in the checklist.
<!-- vpmodule:atom:end negotiation-quick-diagnostic -->
<!-- vpmodule:atom:begin negotiation-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-score
title: Score the negotiation
summary: "Score six Quick Diagnostic rows plus up to four execution points, report the score and the gaps to 10/10, and use only the stated bands 9-10, 5-6 and 3 or less."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing negotiation preparation or execution.
conditions_does_not_apply_when: A conversation with no negotiation objective.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the execution points earned and the gaps to 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the negotiation

Target 10/10. Award one point for each satisfied Quick Diagnostic row (six total) and up to four execution-quality points: emotions labeled aloud; earning 'That's right' rather than 'You're right'; avoiding 'Why?', splitting the difference, and chasing 'yes'; and surfacing at least one Black Swan. Bands: 9-10 means audit delivered, calibrated questions and BATNA prepared, 'That's right' achieved, and Black Swans hunted; 5-6 means some preparation but arguing a position or chasing 'yes'; 3 or less means no audit, no BATNA, or splitting the difference. Always state current score and specific gaps to 10/10.
<!-- vpmodule:atom:end negotiation-score -->
<!-- vpmodule:atom:begin negotiation-situations -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-situations
title: Handle common negotiation situations
summary: "When accused of unfairness, stop and discuss; when anchored extremely, ask how they arrived at the number; when the counterpart goes silent, ask whether they have given up; when they seem irrational, diagnose with calibrated questions."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - stalled-negotiation
conditions_applies_when: A specific counterpart move named in the section.
conditions_does_not_apply_when: A negotiation with no such move.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The response matches the counterpart's move and avoids an immediate concession."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L236-L242"
status: active
revision: 1
---

# Handle common negotiation situations

When the counterpart says “That’s not fair,” stop immediately and ask whether you did something unfair so you can discuss it. When they anchor with an extreme number, do not counter; ask how they arrived at it. When they stop responding, send “Have you given up on [the project]?” to prompt a “No.” When they seem irrational, diagnose with calibrated questions whether they are ill-informed, constrained, or hiding something.
<!-- vpmodule:atom:end negotiation-situations -->
<!-- vpmodule:atom:begin negotiation-styles -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-styles
title: "Adapt to the counterpart's style"
summary: "Read the counterpart as Analyst, Accommodator or Assertive; use facts and patience, rapport with specifics, or efficiency and firmness respectively, borrowing from all three as needed."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - negotiation-style
conditions_applies_when: Choosing how to approach a known counterpart.
conditions_does_not_apply_when: A first contact with no style evidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The approach names the style evidence and the adapted behavior.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L243-L252"
status: active
revision: 1
---

# Adapt to the counterpart's style

Adapt to counterpart style: with an Analyst, use facts, be patient, and do not rush; with an Accommodator, build rapport but pin down specifics; with an Assertive counterpart, be efficient, stand firm, and acknowledge their points. Borrow from all three styles as needed.
<!-- vpmodule:atom:end negotiation-styles -->
<!-- vpmodule:atom:begin negotiation-tactical-empathy -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-tactical-empathy
title: Use tactical empathy
summary: "Imagine the counterpart's situation and voice their pressures and fears before stating your position; be genuine, respect them as a person and stay calm without treating empathy as agreement."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - tactical-empathy
conditions_applies_when: Opening or de-escalating a negotiation.
conditions_does_not_apply_when: A negotiation with no counterpart contact.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The counterpart's situation is stated before the negotiator's position."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L24-L51"
status: active
revision: 1
---

# Use tactical empathy

Consciously imagine the counterpart’s situation and vocalize their perspective to build trust and openness. Before stating your position, articulate their situation, pressures, and fears. Be genuine; respect them as a person regardless of disagreement. Stay calm and positive, and slow the pace to support clear thinking. Empathy is understanding, not agreement.
<!-- vpmodule:atom:end negotiation-tactical-empathy -->
<!-- vpmodule:atom:begin negotiation-thats-right -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-thats-right
title: "Earn 'that's right'"
summary: "Summarize the counterpart's facts, emotions and concerns until they say 'that's right'; treat 'you're right' as dismissal, include emotional subtext, let them say no first and confirm agreement three ways."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - thats-right
conditions_applies_when: Seeking genuine agreement or closing terms.
conditions_does_not_apply_when: A transactional exchange with no relationship to confirm.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The summary covers facts and emotions and the counterpart's response is distinguished from 'you're right'."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L155-L181"
status: active
revision: 1
---

# Earn 'that's right'

Summarize the counterpart’s facts, emotions, and concerns so accurately that they respond “That’s right.” Treat that response as evidence they feel understood; “You’re right” usually signals dismissal, so keep working if you hear it. Include emotional subtext, let them say “No” first to feel safe, and use the Rule of Three by confirming agreement three times in three different ways.
<!-- vpmodule:atom:end negotiation-thats-right -->
<!-- vpmodule:atom:begin negotiation-voice -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: negotiation-voice
title: Control voice and delivery
summary: "Default to a positive, warm, light-hearted voice; use a slow, calm, downward-inflecting voice at critical moments; pause at least four seconds after key statements and read the 7/38/55 words-tone-body split."
capability_tags:
  - negotiate-agreements
pattern_tags:
  - negotiation-voice
conditions_applies_when: "Delivering a negotiation in person, by phone or on video."
conditions_does_not_apply_when: A written negotiation with no voice channel.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The delivery plan names the voice, pauses and nonverbal cues."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/negotiation/SKILL.md; sha256=f808051fc0c50b551de44f66006af298662209d8f39c22cc5600385da45a5e04; locator=skills/negotiation/SKILL.md#L253-L261"
status: active
revision: 1
---

# Control voice and delivery

Use a positive, warm, light-hearted voice with a smile by default. At critical moments, use a slow, calm, downward-inflecting Late-Night DJ Voice. Pause for at least 4 seconds after key statements. Watch counterpart nonverbals using the stated 7% words, 38% tone, and 55% body-language split.
<!-- vpmodule:atom:end negotiation-voice -->