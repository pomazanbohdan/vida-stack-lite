---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-design-sprint-skill-md-0c282486-c01"
title: "wondelai-skills: skills/design-sprint/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/design-sprint/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/design-sprint/SKILL.md\"}"
atom_ids:
  - design-sprint-apply
  - design-sprint-common-mistakes
  - design-sprint-debrief
  - design-sprint-diagnostic
  - design-sprint-five-act-interview
  - design-sprint-five-day-sequence
  - design-sprint-five-users
  - design-sprint-four-step-sketch
atom_count: 8
atoms: "[{\"atom_id\":\"design-sprint-apply\",\"file_sha256\":\"898f32d372898f45698198c7f4115aed725b66006627c07686c5db8b48a6ebe8\",\"content_sha256\":\"58251ff1aadcc0ba861930847f2d8b7cc33a790713aae17a375d646a3b3ef6cd\",\"file_bytes\":1450,\"body_bytes\":296},{\"atom_id\":\"design-sprint-common-mistakes\",\"file_sha256\":\"f88ef10e78f7706475c8c0686296f2daf2225e90d4652a6cf0c727146b0819ae\",\"content_sha256\":\"58443042d2503e1967b818c86e9e7b88c863b5482351acb4efd108dab23cf17d\",\"file_bytes\":1557,\"body_bytes\":432},{\"atom_id\":\"design-sprint-debrief\",\"file_sha256\":\"4780eda7321745131fa810a48ea66725dffc7c0f378cb6a8242eb2caa7eb8ad5\",\"content_sha256\":\"21fdffcab6ff41d2a2f3f7064d89c878ae4ea9bd0958f92724bfb29239743be3\",\"file_bytes\":1544,\"body_bytes\":423},{\"atom_id\":\"design-sprint-diagnostic\",\"file_sha256\":\"2ef9b465f909d69b972c249187bd32ed51c1f371502a8cabb3fda698b41bf87a\",\"content_sha256\":\"aa80d7118456fc879ee56cf8d477af58189d212d959b1af1ba11759499f56fe0\",\"file_bytes\":1648,\"body_bytes\":442},{\"atom_id\":\"design-sprint-five-act-interview\",\"file_sha256\":\"b5d3056610d89cf7fae953eb2089f72ed7415a2a6f5271fdacf1a3f02f781576\",\"content_sha256\":\"de08fd0652f3e3eaba169dd37c3aab40c809afb3b11bae07d88b4725f253d594\",\"file_bytes\":1834,\"body_bytes\":672},{\"atom_id\":\"design-sprint-five-day-sequence\",\"file_sha256\":\"f4cf16f1f02ff8dee122028950f82f272eaeeafef5070721f746c6f2605b574a\",\"content_sha256\":\"1d51f2a7a40af9bc1f7da404e4a6f55ed1dc4086dfff06240d1c366c94fdfd79\",\"file_bytes\":1584,\"body_bytes\":384},{\"atom_id\":\"design-sprint-five-users\",\"file_sha256\":\"6535dbfcb0d47625be6c35ae5bc7808918cd45fcfcf69eb1d0459571540f0210\",\"content_sha256\":\"b87660f1ac102986ecefd657990363624b6210c6cc1c33adeeb400194813c44d\",\"file_bytes\":1430,\"body_bytes\":290},{\"atom_id\":\"design-sprint-four-step-sketch\",\"file_sha256\":\"784e6a46d57606691005ca68594ccd2e149764a54cb79f52c647ccb2854d747d\",\"content_sha256\":\"58f042059a48ffb3a723ac4e3d745092937c9d7165c4389f6564cb63ffeeb22c\",\"file_bytes\":1702,\"body_bytes\":519}]"
carrier_sha256: 8b861f73aab9deac5a1cf46e7bc89d32ecd0a8a13d301c34d800b77c6d4b43fe
carrier_bytes: 13632
revision: 1
status: active
---
<!-- vpmodule:atom:begin design-sprint-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-apply
title: Run a five-day design sprint
summary: "Compress debate, design and user testing into one fixed Monday-to-Friday week with hard time-boxes and one Decider before writing production code."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A high-stakes product question that needs evidence within a week.
conditions_does_not_apply_when: A problem whose solution is obvious and only execution remains.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The plan fixes one week, names the Decider, and schedules user testing before build."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L14-L17"
status: active
revision: 1
---

# Run a five-day design sprint

A design sprint compresses debate, design, and testing into one fixed Monday-to-Friday week with hard time-boxes and one Decider, and tests ideas with real users before production code is written. Use it to resolve a high-stakes product question within five days.
<!-- vpmodule:atom:end design-sprint-apply -->
<!-- vpmodule:atom:begin design-sprint-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-common-mistakes
title: Avoid the listed design-sprint mistakes
summary: "Do not skip prototyping, over-engineer, skip screening, explain the prototype, or run without the Decider for the full week, and apply each stated fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a sprint plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L208-L218"
status: active
revision: 1
---

# Avoid the listed design-sprint mistakes

Do not skip prototyping; always make even a simple prototype. Do not over-engineer; use a facade rather than working code. Screen for target customers to avoid invalid feedback. Do not explain the prototype; run Acts 3-4 as written and let users interpret and struggle unaided. Secure the Decider for the full week or do not sprint. Protect the week from meetings and email interruptions.
<!-- vpmodule:atom:end design-sprint-common-mistakes -->
<!-- vpmodule:atom:begin design-sprint-debrief -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-debrief
title: Run the end-of-sprint debrief
summary: "Organize findings as what worked, failed and was mixed, then decide to build, run another sprint on details, pivot, or return to the drawing board."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: Closing the sprint after Friday interviews.
conditions_does_not_apply_when: A decision made before the findings are organized.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The findings are grouped into the three categories and a next-step decision is recorded.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L182-L193"
status: active
revision: 1
---

# Run the end-of-sprint debrief

Organize findings as what worked, failed, and was mixed, then decide next steps: if the core concept is validated, build it or run another sprint on details; if major issues remain, pivot or sprint again on them; if it totally fails, return to the drawing board. Friday output includes interview recordings, pattern notes, a clear list of what works and does not, and a next-step decision.
<!-- vpmodule:atom:end design-sprint-debrief -->
<!-- vpmodule:atom:begin design-sprint-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-diagnostic
title: Run the design-sprint diagnostic
summary: "Check Decider commitment, problem importance, one-day prototype feasibility, five target users and no interruptions, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a sprint plan.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L219-L230"
status: active
revision: 1
---

# Run the design-sprint diagnostic

Audit a sprint plan for a full-week Decider, sufficient problem importance, one-day prototype feasibility, ability to recruit five target users, and team commitment to no interruptions. If an answer is no, obtain Decider commitment or postpone; sprint only on big challenges; choose a more concrete problem; start recruiting two weeks ahead; and get leadership buy-in for uninterrupted work, respectively.
<!-- vpmodule:atom:end design-sprint-diagnostic -->
<!-- vpmodule:atom:begin design-sprint-five-act-interview -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-five-act-interview
title: Run the five-act interview
summary: "Run five acts: welcome and permission with think-aloud, current behavior and mindset, prototype introduction without explanation, tasks and nudges, and debrief questions."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Running each Friday interview.
conditions_does_not_apply_when: A demo where the interviewer explains the prototype.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each act occurs, the interviewer does not explain the prototype, and the customer thinks aloud."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L154-L165"
status: active
revision: 1
---

# Run the five-act interview

Run five interview acts per customer: welcome warmly, explain that the prototype is being tested rather than the participant, obtain recording permission, and encourage thinking aloud (5 min); ask about current behavior and mindset (5 min); introduce the prototype with open interpretation and do not explain it (5 min); allow open exploration and storyboard tasks, using open nudges when stuck and do not help (15 min); then debrief on overall impression, audience, what worked, and what confused them (5 min). Plan about 45 minutes per customer including setup/transitions and 30-minute breaks to discuss observations and adjust questions.
<!-- vpmodule:atom:end design-sprint-five-act-interview -->
<!-- vpmodule:atom:begin design-sprint-five-day-sequence -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-five-day-sequence
title: Run the five-day sequence with the required conditions
summary: "Run Monday Map, Tuesday Sketch, Wednesday Decide, Thursday Prototype and Friday Test only with a Decider, 4-7 diverse participants, five uninterrupted days, a dedicated room and one Sprint Master."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Scheduling a design sprint.
conditions_does_not_apply_when: A team without a Decider or uninterrupted week.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The schedule names each day, the Decider, the participant range, the room and the Sprint Master."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L35-L45"
status: active
revision: 1
---

# Run the five-day sequence with the required conditions

Run the five-day sequence Monday Map, Tuesday Sketch, Wednesday Decide, Thursday Prototype, and Friday Test only for a substantial challenge with a Decider and 4-7 diverse participants, five uninterrupted 10am-5pm days, a dedicated room with whiteboards, and one Sprint Master who facilitates, keeps time, and manages energy.
<!-- vpmodule:atom:end design-sprint-five-day-sequence -->
<!-- vpmodule:atom:begin design-sprint-five-users -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-five-users
title: Recruit five target users
summary: "Patterns emerge after 3-5 participants and returns diminish after five; recruit with a screener, pay $100-$200 for B2B or $50-$100 for B2C, and start two weeks before the sprint."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Recruiting Friday participants.
conditions_does_not_apply_when: A convenience sample with no screener.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Five screened target users are booked at least two weeks ahead with the stated incentive.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L166-L171"
status: active
revision: 1
---

# Recruit five target users

Patterns emerge after 3-5 participants and returns diminish after five; five interview-plus-break slots fit one day. Recruit target customers using a screener survey and offer $100-$200 for B2B or $50-$100 for B2C; begin recruiting two weeks before the sprint.
<!-- vpmodule:atom:end design-sprint-five-users -->
<!-- vpmodule:atom:begin design-sprint-four-step-sketch -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-sprint-four-step-sketch
title: Run the four-step sketch
summary: "Sketch alone: review the map and inspiration for 20 minutes, generate rough ideas for 20 minutes, fold paper into eight panels for eight variations in eight minutes, then make a three-panel beginning-middle-end sketch."
capability_tags:
  - generate-divergent-sketches
pattern_tags:
  - divergent-sketching
conditions_applies_when: Tuesday sketching.
conditions_does_not_apply_when: A single quick sketch with no silent review.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The four steps and their time boxes are followed, and each person produces a three-panel sketch."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-sprint/SKILL.md; sha256=2da4890a338abf865e627dbc23af4d5beafb0d66c50a9c79ac3def67a188a7a6; locator=skills/design-sprint/SKILL.md#L78-L90"
status: active
revision: 1
---

# Run the four-step sketch

Have everyone sketch alone without group brainstorming. Complete four steps: silently review map, HMWs, and inspiration for 20 minutes; generate rough ideas for 20 minutes, prioritizing quantity over quality; fold paper into eight panels and sketch eight variations in eight minutes; then make a 3-panel beginning-middle-end customer-experience storyboard in 30-90 minutes that is self-explanatory, titled, and anonymous. Produce one detailed, anonymous, self-explanatory sketch per person.
<!-- vpmodule:atom:end design-sprint-four-step-sketch -->