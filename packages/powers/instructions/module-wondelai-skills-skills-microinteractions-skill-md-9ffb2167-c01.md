---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-microinteractions-skill-md-9ffb2167-c01"
title: "wondelai-skills: skills/microinteractions/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/microinteractions/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/microinteractions/SKILL.md\"}"
atom_ids:
  - microinteractions-common-mistakes
  - microinteractions-core
  - microinteractions-feedback
  - microinteractions-loops-modes
  - microinteractions-quick-diagnostic
  - microinteractions-rules
  - microinteractions-score
  - microinteractions-signature-moments
atom_count: 8
atoms: "[{\"atom_id\":\"microinteractions-common-mistakes\",\"file_sha256\":\"afaf245bbefd866e4de0fd47a2abd225018943c5675a5b5f8b750ee9530f0bda\",\"content_sha256\":\"37e0f952dd3d862277b45df6d7c68dc834c31a96fd40847680e0d13e06b8d993\",\"file_bytes\":2482,\"body_bytes\":1306},{\"atom_id\":\"microinteractions-core\",\"file_sha256\":\"57a18867e69eae0b7e94292ca754fb216edff9db5c3f622671cef83c0eb26f81\",\"content_sha256\":\"7084f2daa06a18ff34aa3fe134350f554b11458b59385c2366b5332f816e50ca\",\"file_bytes\":1685,\"body_bytes\":467},{\"atom_id\":\"microinteractions-feedback\",\"file_sha256\":\"f54e8668e1d092f8a16e766a793fe23cd05c156aad189db2fb7dfe26d57ef16d\",\"content_sha256\":\"6fdbb9ae8ef519c09cff28964d194742ff51722a38f49c374fa311c21d153c48\",\"file_bytes\":2260,\"body_bytes\":1048},{\"atom_id\":\"microinteractions-loops-modes\",\"file_sha256\":\"104218ee6ce104d8c479249ff9c1ff4386579a37d37d6f7ef747b1a42da4c5f9\",\"content_sha256\":\"e21d4c0caeba34274a5636ddc9fefe06887ce7dc750eea751a9cb7c45f238afd\",\"file_bytes\":2292,\"body_bytes\":1091},{\"atom_id\":\"microinteractions-quick-diagnostic\",\"file_sha256\":\"0bb80316a250a78994058120b909558db1348df53a05a36eca9b141e909bf784\",\"content_sha256\":\"5005e7ca7aa82e8c71b98e8b7dc213cd4466343485f9324be290214987bbcd4b\",\"file_bytes\":2674,\"body_bytes\":1441},{\"atom_id\":\"microinteractions-rules\",\"file_sha256\":\"5bfb8c93f72fa1515b14d2b768642b6e15ff646207959c1ea4f952c206bab3a1\",\"content_sha256\":\"2101b5baa3579204f4e328a892b29a6b0e03e1b5cedc162db773987e2ecb993e\",\"file_bytes\":2160,\"body_bytes\":968},{\"atom_id\":\"microinteractions-score\",\"file_sha256\":\"0badcad766ccc084f266b1ffb8286317618a8db8d7217b66d4d045bedef4b115\",\"content_sha256\":\"2f00fc5eda57ebaa576c5deb66c1a365551a091c6ed58d2f6c30590df1053df7\",\"file_bytes\":1978,\"body_bytes\":792},{\"atom_id\":\"microinteractions-signature-moments\",\"file_sha256\":\"c6791c0024aa561dea86cdd44a37b7bc30ba0a339c3309228743925322e5afe8\",\"content_sha256\":\"a48ffb32226037c9c00a924d8c128f66635d68aa61e666c5b1be082adac77153\",\"file_bytes\":2144,\"body_bytes\":926}]"
carrier_sha256: f0d7fcfd0dff5de310a322c9731fdb7f49bce1703d4cb08263f428a96131f582
carrier_bytes: 18588
revision: 1
status: active
---
<!-- vpmodule:atom:begin microinteractions-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-common-mistakes
title: Avoid the common microinteraction mistakes
summary: "Check the eight recurring failures: no feedback, overdesign, ignored edge cases, invisible triggers, mode errors, ignored long loops, feedback overload and fake progress; apply the stated fix for each."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a microinteraction for the listed failure patterns.
conditions_does_not_apply_when: A finding already covered by a narrower instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L176-L188"
status: active
revision: 1
---

# Avoid the common microinteraction mistakes

Avoid these microinteraction mistakes and apply their fixes: no feedback on action, because users cannot tell whether a tap registered, is fixed by adding an immediate visual state change to every interactive element; overdesigning simple moments, because complex animations slow frequent actions, is fixed by reserving rich animation for infrequent, high-impact moments; ignoring edge cases, which breaks at zero, maximum, or double-tap, is fixed by mapping every state: empty, loading, partial, full, error, and disabled; invisible triggers, which prevent discovery, are fixed by pairing gesture triggers with a visible alternative; mode errors, where the same action gives different results based on hidden state, are fixed by making the current mode visible and minimizing modes; ignoring long loops, which makes the interaction feel identical on day 1 and day 100, is fixed by using progressive reduction for returning users; feedback overload, where every action triggers a toast, sound, or animation, is fixed by using the smallest feedback that communicates; and fake progress indicators, which deceive users when they discover the bar is fake, are fixed by using honest, deterministic progress or an indeterminate spinner when the outcome is unknown.
<!-- vpmodule:atom:end microinteractions-common-mistakes -->
<!-- vpmodule:atom:begin microinteractions-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-core
title: Apply the four-part microinteraction structure
summary: "Design every contained product moment through Dan Saffer's four parts: a trigger initiates it, rules determine what happens, feedback shows what is happening, and loops and modes define its long-term behavior."
capability_tags:
  - design-microinteraction
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: "Designing, auditing or improving a microinteraction."
conditions_does_not_apply_when: A large multi-step flow that is not a contained moment.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The four parts are named and the moment is scoped to a single use case.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L14-L17"
status: active
revision: 1
---

# Apply the four-part microinteraction structure

A microinteraction is a small, contained product moment built around a single use case, and the difference between a tolerated and loved product is claimed to come almost always from these details. Design and audit every microinteraction through Dan Saffer's four-part structure: a Trigger initiates it, Rules determine what happens, Feedback shows what is happening, and Loops & Modes define its long-term behavior.
<!-- vpmodule:atom:end microinteractions-core -->
<!-- vpmodule:atom:begin microinteractions-feedback -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-feedback
title: "Give immediate, proportional feedback"
summary: "Deliver feedback under 100ms for direct manipulation, use the least noticeable signal that communicates, scale it to event significance, keep visual primary and audio or haptic supplementary, prefer honest progress, and never fake completion."
capability_tags:
  - design-microinteraction
pattern_tags:
  - response-timing
conditions_applies_when: Choosing feedback for an interaction.
conditions_does_not_apply_when: A background process with no user-visible effect.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Direct feedback is within 100ms and its strength matches the event.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L79-L103"
status: active
revision: 1
---

# Give immediate, proportional feedback

Feedback must let users tell whether their action registered and the system is working by communicating what is happening now through visual channels such as color, animation, and movement, aural channels such as clicks and chimes, or haptic channels such as vibration; show only what matters: minimal, meaningful, and contextual. Feedback must be immediate, under 100ms for direct manipulation; use the least noticeable feedback that still communicates, prefer animating existing elements such as the button itself over a separate toast, scale feedback to event significance, keep visual feedback primary with audio and haptics supplementary and never the only channel, and use progress indicators because they reduce perceived wait even when actual wait is unchanged. Feedback must be honest: no fake progress bars, manipulative countdowns, or deceptive completion percentages. Representative cases include button state changes, inline validation as the user types, and contextual errors near the source.
<!-- vpmodule:atom:end microinteractions-feedback -->
<!-- vpmodule:atom:begin microinteractions-loops-modes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-loops-modes
title: Design loops and use modes sparingly
summary: "Classify loops as open, closed or long; mature the interaction over time through progressive reduction; minimize modes and make the current one highly visible; and never adapt loops to increase notifications or obstruct opt-outs."
capability_tags:
  - design-microinteraction
pattern_tags:
  - loop-mode
conditions_applies_when: Designing interaction behavior over time or with modes.
conditions_does_not_apply_when: A one-shot interaction that never recurs.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Loop type, change over time and mode visibility are specified."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L104-L127"
status: active
revision: 1
---

# Design loops and use modes sparingly

Loops are the meta-rules over time -- whether the interaction changes after the 100th use, expires, or adapts; modes are forks in the rules where the same control temporarily behaves differently (e.g., edit mode vs. view mode). Open loops continue until explicitly stopped (a repeating alarm); closed loops run once and end (a timer); long loops change the interaction over time (first use shows a tooltip, the 50th does not). Progressive reduction: strip away scaffolding as users demonstrate mastery. Modes are dangerous because they violate 'same action, same result': minimize them and make the current mode highly visible (Caps Lock indicator, edit banner). Prohibition: loops should benefit the user, not the business -- never adapt loops to ramp up notifications or make opt-outs progressively harder. Illustrative applications: onboarding tooltips via long loops (first 3 sessions show 'Swipe to archive', then stop), alarms as open loops repeating until disabled, text editing view/edit modes with a visible 'Editing' banner and 'Done' exit.
<!-- vpmodule:atom:end microinteractions-loops-modes -->
<!-- vpmodule:atom:begin microinteractions-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-quick-diagnostic
title: Run the microinteraction diagnostic
summary: "Audit eight questions covering trigger discoverability, trigger state, rule predictability, immediate feedback, feedback scale, evolution over time, unnecessary modes and first-time learnability, with a named action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a microinteraction.
conditions_does_not_apply_when: A full scored audit.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L189-L203"
status: active
revision: 1
---

# Run the microinteraction diagnostic

Quick Diagnostic: audit any microinteraction against 8 questions, each with an If-No diagnosis and a mandatory Action. (1) Is there a clear, discoverable trigger? If no -- users cannot initiate the interaction; action: add a visible control or affordance. (2) Does the trigger show its current state? If no -- users cannot tell if it is on, off, or loading; action: add distinct visual states for every trigger state. (3) Are the rules simple and predictable? If no -- users are confused by what happened; action: simplify rules and match platform conventions. (4) Is there immediate feedback? If no -- users question whether their action worked; action: add visual response within 100ms. (5) Does feedback match the event's significance? If no -- small actions feel dramatic or big results feel trivial; action: scale feedback to event importance. (6) Does the interaction evolve over time? If no -- power users still see beginner hints; action: add progressive reduction through long loops. (7) Is the interaction free of unnecessary modes? If no -- users perform the wrong action in the wrong mode; action: remove modes or make the current mode highly visible. (8) Could a first-time user figure it out without help? If no -- the interaction needs explanation; action: simplify or add a one-time hint via long loop. This 8-row table is the scoring denominator referenced by the scoring instruction.
<!-- vpmodule:atom:end microinteractions-quick-diagnostic -->
<!-- vpmodule:atom:begin microinteractions-rules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-rules
title: Make rules predictable and error-resistant
summary: "Derive rules from the interaction's goal, match mental models and platform conventions, constrain inputs by length, range and format, handle zero, maximum, repeated triggers and interruption, and never hide manipulative rules."
capability_tags:
  - design-microinteraction
pattern_tags:
  - predictable-rules
conditions_applies_when: Defining what happens after a trigger fires.
conditions_does_not_apply_when: A static screen with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Goal, conventions, input constraints and edge cases are specified."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L55-L78"
status: active
revision: 1
---

# Make rules predictable and error-resistant

Rules define what happens once a microinteraction is triggered: the sequence of events, constraints, processing, and ending; users never see rules directly but feel when they are wrong. Rules must be derived from the microinteraction's goal defined first, and must match existing mental models and platform conventions. Inputs must be constrained to prevent errors: limit character counts, set value ranges, enforce formats. Edge cases must be handled explicitly: zero, maximum, repeated triggers, interruption. Prohibition: keep rules transparent and predictable -- never hide rules that manipulate behavior, such as making unsubscribe harder than subscribe. Illustrative applications: password-strength meters evaluating input in real time, character counters that constrain and show remaining (turning red at the limit), and undo actions whose rules set a reversal time window (e.g., Gmail 'Undo send' for 30 seconds).
<!-- vpmodule:atom:end microinteractions-rules -->
<!-- vpmodule:atom:begin microinteractions-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-score
title: Score the 8-row microinteraction diagnostic
summary: "Score a microinteraction by counting the Quick Diagnostic rows it passes, compute round(passed / 8 x 10), read the stated band, and report the score, failed rows and a specific fix for each."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a microinteraction.
conditions_does_not_apply_when: A code review that does not assess the interaction.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - specific-fixes
artifact_contract_verified_by: "The report states the score, failed rows and a specific fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score the 8-row microinteraction diagnostic

Score a microinteraction against the 8 Quick Diagnostic rows with the stated goal of 10/10: count how many rows it passes and compute score = round(passed / 8 × 10), then read the stated band. The bands are 9-10 for passing all 8 rows, described as a deliberate discoverable trigger with visible states, simple predictable rules, sub-100ms feedback scaled to event significance, evolution over time, mode-free or mode-visible behavior, and learnability without help; 5-6 for 4-5 rows passing, meaning it works but has a generic feel; and <=3 for 2 or fewer rows passing, meaning missing feedback, invisible triggers, or hidden modes that break trust. Always state the current score, which diagnostic rows failed, and the specific fix for each.
<!-- vpmodule:atom:end microinteractions-score -->
<!-- vpmodule:atom:begin microinteractions-signature-moments -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-signature-moments
title: Create one or two signature moments
summary: "Give the product one or two distinctive moments on frequent, visible actions; keep function before delight, align the moment with brand personality, pass the removal test, and never block the next step behind a non-skippable celebration."
capability_tags:
  - design-microinteraction
pattern_tags:
  - signature-moment
conditions_applies_when: Choosing where to invest distinctive interaction design.
conditions_does_not_apply_when: "A rare, buried settings action."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The moment passes the removal test and does not block the next step.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L128-L152"
status: active
revision: 1
---

# Create one or two signature moments

A signature moment is a microinteraction so distinctive it becomes part of the product's identity (Facebook Like, slide-to-unlock, Slack loading messages). Every product should have one or two signature moments; not every interaction should be one. Put signature moments on frequent, visible actions -- not buried settings. Functional first, delightful second: never sacrifice usability for novelty. Common tools are animation, sound, and copy; align with brand personality. Removal test: if users would not miss it, it is decoration, not signature. Prohibition: never block input or the next step behind a non-skippable celebration animation -- let the user tap through the confetti to proceed. Illustrative applications: social reactions (animated Like with particles), branded loading states (Slack rotating quotes), completion celebrations (Stripe animated checkmark with confetti).
<!-- vpmodule:atom:end microinteractions-signature-moments -->