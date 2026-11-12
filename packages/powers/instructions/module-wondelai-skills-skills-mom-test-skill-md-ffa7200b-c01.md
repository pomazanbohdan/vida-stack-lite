---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-mom-test-skill-md-ffa7200b-c01"
title: "wondelai-skills: skills/mom-test/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/mom-test/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/mom-test/SKILL.md\"}"
atom_ids:
  - mom-test-avoid-bad-data
  - mom-test-commitment
  - mom-test-common-mistakes
  - mom-test-diagnostic
  - mom-test-find-conversations
  - mom-test-good-questions
  - mom-test-process-notes
  - mom-test-score
atom_count: 8
atoms: "[{\"atom_id\":\"mom-test-avoid-bad-data\",\"file_sha256\":\"363e018abafde697672667318e089fb9480888228b5d661a54fdd6a75f48b5bd\",\"content_sha256\":\"23b4b5bf62dccd0c048e79985ebf64c60af6a843f0ad767e29ecfc4c8c88ba21\",\"file_bytes\":1399,\"body_bytes\":311},{\"atom_id\":\"mom-test-commitment\",\"file_sha256\":\"504c40e48156d7544eb6a56950b9212c58afb7d20c9babd47e07495c1e338c3a\",\"content_sha256\":\"5a09f0fa82fcaacfc85eefb7340d9e6c7c3a270ea9a697656143647a06ae6406\",\"file_bytes\":1335,\"body_bytes\":262},{\"atom_id\":\"mom-test-common-mistakes\",\"file_sha256\":\"685976968a5677b31131ebaa8b3f24472d2023a9340de8abc901b0afb46e73e8\",\"content_sha256\":\"a34b16cb28ea68449bc16e3fd67952e3d94d294d15f6408d9e1c95e129f9626d\",\"file_bytes\":1433,\"body_bytes\":296},{\"atom_id\":\"mom-test-diagnostic\",\"file_sha256\":\"056d138784e7c4461f6cfe52c205ba827b4a4bbda97bad1bbcb7bb5c0cc92576\",\"content_sha256\":\"90b2a99fd84efa54596112c88a12f44d2630823426efae60f63ea607d98f6118\",\"file_bytes\":1335,\"body_bytes\":237},{\"atom_id\":\"mom-test-find-conversations\",\"file_sha256\":\"9ef474ffa7b60cace8fb5e8cb2c295a2ddfcebe39e79108f0df5ab0014c698cf\",\"content_sha256\":\"14eff0ed751e2ce9d839a7ef08639a35426e6d035e37446b6357ad59eaa5cc34\",\"file_bytes\":1336,\"body_bytes\":230},{\"atom_id\":\"mom-test-good-questions\",\"file_sha256\":\"1221dd94b2e7ef6d003d28e67e0f30639d4762fd4655d91a3805ae2b611447ff\",\"content_sha256\":\"ee6171b8cfb3d1e333a0c7c94235479db4096d1986d4ca16d3efec2b3d5d5312\",\"file_bytes\":1353,\"body_bytes\":260},{\"atom_id\":\"mom-test-process-notes\",\"file_sha256\":\"efc5b948c69134d119099c63c1f939a2a8bc55e01d14d481620cc92d305e3087\",\"content_sha256\":\"211b12fdab2d4c28d93a94647c8cb5e5dcf0715c3fcba5ab644824fef1322892\",\"file_bytes\":1322,\"body_bytes\":231},{\"atom_id\":\"mom-test-score\",\"file_sha256\":\"a5ec21ed3edaa0d45fc7a19e1de78d6187e17d0d10629e0679686e9866696bdb\",\"content_sha256\":\"82f32161e3f68a19fee309b082a1221704182bde1aa355d8641721bd560d5c36\",\"file_bytes\":1305,\"body_bytes\":242}]"
carrier_sha256: c6f3866cb5d17aca35410c9bcc5d5afb9a8bf9ab1d85dc53761f97618e919118
carrier_bytes: 11623
revision: 1
status: active
---
<!-- vpmodule:atom:begin mom-test-avoid-bad-data -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-avoid-bad-data
title: "Deflect compliments, fluff and ideas"
summary: "Recognize compliments, hypotheticals and disconnected feature requests as bad data, and dig for the underlying facts."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Interpreting customer statements during discovery.
conditions_does_not_apply_when: A direct request that is already backed by observed behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Compliments, fluff and ideas are not recorded as validation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L84-L111"
status: active
revision: 1
---

# Deflect compliments, fluff and ideas

Three types of bad data feel like progress but actively mislead: compliments ("That's a great idea!"), fluff (hypotheticals, maybes, future promises), and ideas (feature requests disconnected from real problems). Deflecting these and digging for truth is the core skill.
<!-- vpmodule:atom:end mom-test-avoid-bad-data -->
<!-- vpmodule:atom:begin mom-test-commitment -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-commitment
title: "Seek commitment, not compliments"
summary: End each conversation with a clear advance toward adoption or a clear rejection.
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Closing a customer discovery conversation.
conditions_does_not_apply_when: A purely exploratory conversation with no adoption decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The conversation ends with a concrete commitment or a clear rejection, not polite interest."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L112-L139"
status: active
revision: 1
---

# Seek commitment, not compliments

The currency of a customer conversation is commitment, not compliments. End every conversation with a clear advance toward adoption or a clear rejection -- the worst outcome is a "zombie lead" who is polite but never commits.
<!-- vpmodule:atom:end mom-test-commitment -->
<!-- vpmodule:atom:begin mom-test-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-common-mistakes
title: Avoid common customer-conversation mistakes
summary: "Avoid pitching, hypotheticals, compliment validation, interviewer dominance, ending without an ask, overly formal sessions and unprocessed notes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a customer discovery practice for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the past-behavior correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L199-L210"
status: active
revision: 1
---

# Avoid common customer-conversation mistakes

Avoid pitching, hypotheticals, compliment validation, interviewer dominance, ending without an ask, overly formal sessions, and unprocessed individual notes; use past-behavior questions, an advance, casual conversations, and shared raw-note review.
<!-- vpmodule:atom:end mom-test-common-mistakes -->
<!-- vpmodule:atom:begin mom-test-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-diagnostic
title: Run the Mom Test diagnostic
summary: "Check past-behavior focus, concrete facts, commitment, talk time, disconfirming learning, belief updates and fact-based notes."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A quick diagnostic review of customer conversations.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L211-L224"
status: active
revision: 1
---

# Run the Mom Test diagnostic

Check life/past-behavior focus, concrete facts, commitment, participant talk time, potentially disconfirming learning, belief updates, and fact-based notes; apply the prescribed follow-up for each failure.
<!-- vpmodule:atom:end mom-test-diagnostic -->
<!-- vpmodule:atom:begin mom-test-find-conversations -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-find-conversations
title: Find conversations without pitching
summary: "Use warm introductions, communities, events and brief non-pitch outreach, and never disguise a sales call as research."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Recruiting customers for discovery conversations.
conditions_does_not_apply_when: A paid market-research panel with its own disclosure rules.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Outreach is clearly learning-oriented and does not disguise a sales call.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L140-L169"
status: active
revision: 1
---

# Find conversations without pitching

Find conversations through warm introductions, communities, events, and brief non-pitch outreach; frame learning casually, participate genuinely, and never disguise a sales call as research.
<!-- vpmodule:atom:end mom-test-find-conversations -->
<!-- vpmodule:atom:begin mom-test-good-questions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-good-questions
title: Ask about observable past behavior
summary: "Avoid questions that ask for predictions, hypothetical product evaluations or confirmation, and anchor on past behavior."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Writing customer interview questions.
conditions_does_not_apply_when: A survey designed for statistical measurement rather than discovery.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Questions ask for specific past behavior and extract concrete facts.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L57-L83"
status: active
revision: 1
---

# Ask about observable past behavior

Most interview questions are broken because they ask people to predict the future, evaluate hypothetical products, or confirm your assumptions. Good questions anchor in observable past behavior and extract concrete facts.
<!-- vpmodule:atom:end mom-test-good-questions -->
<!-- vpmodule:atom:begin mom-test-process-notes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-process-notes
title: Process notes into shared beliefs
summary: "Distill raw notes into beliefs, update them regularly and share them with the team to avoid cherry-picking."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - evidence-preservation
conditions_applies_when: Turning customer conversations into reusable evidence.
conditions_does_not_apply_when: A single conversation with no team decision.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - notes
  - beliefs
artifact_contract_verified_by: Raw notes become dated beliefs that the team reviews and updates.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L170-L198"
status: active
revision: 1
---

# Process notes into shared beliefs

Conversations are only useful if processed: distill raw notes into beliefs, update them regularly, and share with your team. Without a system you'll cherry-pick quotes that confirm your biases.
<!-- vpmodule:atom:end mom-test-process-notes -->
<!-- vpmodule:atom:begin mom-test-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-score
title: Score the customer conversations
summary: "Score the seven diagnostic rows, report the score, failed rows and fixes."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing whether customer conversations produce evidence.
conditions_does_not_apply_when: A narrow sales review that does not assess learning.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, failed rows and fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L18-L26"
status: active
revision: 1
---

# Score the customer conversations

Score seven diagnostic rows, 1 point per passing row; report score, failed rows, and fixes. Bands classify evidence-based conversations, mixed conversations, and pitches with leading questions/no learning.
<!-- vpmodule:atom:end mom-test-score -->