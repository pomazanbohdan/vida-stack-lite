---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-steve-jobs-design-review-skill-md-727dc9cc-c01"
title: "wondelai-skills: skills/steve-jobs-design-review/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/steve-jobs-design-review/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/steve-jobs-design-review/SKILL.md\"}"
atom_ids:
  - steve-jobs-design-review-back-of-fence
  - steve-jobs-design-review-behavior
  - steve-jobs-design-review-common-mistakes
  - steve-jobs-design-review-core
  - steve-jobs-design-review-demo
  - steve-jobs-design-review-focus
  - steve-jobs-design-review-principle
  - steve-jobs-design-review-quick-diagnostic
atom_count: 8
atoms: "[{\"atom_id\":\"steve-jobs-design-review-back-of-fence\",\"file_sha256\":\"72198643f85f5fd54674bb9e5642e23bf206b085d38aaede3a8b9ee0c09d2f23\",\"content_sha256\":\"492538aa6527d45ca155a9d2d5a93a841ea451300f31a99a7d03443adf0722a3\",\"file_bytes\":1985,\"body_bytes\":795},{\"atom_id\":\"steve-jobs-design-review-behavior\",\"file_sha256\":\"6c6952bf1afdd01ee07a595cfd1bb92d80230ae2a7cf77b7ab60a7e71f6d4e66\",\"content_sha256\":\"e7a6c62effe07ae7f5b98e052d2c02024792ed9d5e7941ef975148cb2ba69054\",\"file_bytes\":2181,\"body_bytes\":963},{\"atom_id\":\"steve-jobs-design-review-common-mistakes\",\"file_sha256\":\"3f714bf8a0fcf220c97c0163f3fcbca2f5b111c8f82522549d869c121c9a6417\",\"content_sha256\":\"8ca892203bda17600425da50d1036fdd1989b6e61672eb721036bd3871589ec7\",\"file_bytes\":2260,\"body_bytes\":1091},{\"atom_id\":\"steve-jobs-design-review-core\",\"file_sha256\":\"b1de07ae2e1fb8179451687886050df32d57acb59e39099710967fb40c6f9af9\",\"content_sha256\":\"dc9430bb13c10195abece53ec21fdc66cc10e569b4b9f1ca6794a7660e1d753e\",\"file_bytes\":1415,\"body_bytes\":233},{\"atom_id\":\"steve-jobs-design-review-demo\",\"file_sha256\":\"b2382dda0400f693f4b08e542d006ae09fe09e71335c7561fc264984c799ac16\",\"content_sha256\":\"93ee6e310a365f0e9e60809bb28f138ce9b21fcf53983a8ab3107c464b95e2ec\",\"file_bytes\":2103,\"body_bytes\":930},{\"atom_id\":\"steve-jobs-design-review-focus\",\"file_sha256\":\"f092abc38731555477185f2a9051502beda0412f924fa677652375438a3a3efb\",\"content_sha256\":\"82155c53883ea3522a73346c265d936f880cb01bc476ab7b8c4a60cabe8dd7ac\",\"file_bytes\":1854,\"body_bytes\":708},{\"atom_id\":\"steve-jobs-design-review-principle\",\"file_sha256\":\"9f2fcfbaff2bb5f24f599f2afe7d1040cb46277c2ae6e0c19326083feb99a51c\",\"content_sha256\":\"701ba147c141a5b914ed545f5103a2915e2712fb7071eb0fd908d79835ebe32d\",\"file_bytes\":1497,\"body_bytes\":362},{\"atom_id\":\"steve-jobs-design-review-quick-diagnostic\",\"file_sha256\":\"41a52413c375c5db5fdb5d28e340e68a199e33695052467fb7bc81a6b92faac6\",\"content_sha256\":\"2defe8548527788d23f25b19c9f34805313dc88d6c22fd04292d43fa5802e7bc\",\"file_bytes\":2367,\"body_bytes\":1188}]"
carrier_sha256: 6c17fb8900f93de2a3fb1545261d7a404b023acd1b5796c80996ecd820b10369
carrier_bytes: 16673
revision: 1
status: active
---
<!-- vpmodule:atom:begin steve-jobs-design-review-back-of-fence -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-back-of-fence
title: Hold unseen surfaces to the same standard
summary: "Apply the back-of-the-fence standard to empty states, error copy, settings, loading screens and emails; treat taste as trainable and enforced by review; and treat the ugliest screen as the real quality bar."
capability_tags:
  - review-product-design
pattern_tags:
  - back-of-fence-standard
conditions_applies_when: Auditing unseen surfaces and edge states.
conditions_does_not_apply_when: A public-facing marketing page only.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the weakest unseen surface and its fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L172-L199"
status: active
revision: 1
---

# Hold unseen surfaces to the same standard

Apply the back-of-the-fence standard: quality includes unseen surfaces, so hold empty states, error copy, settings pages, loading screens, emails, and other rarely demoed screens such as 404 pages to the same bar as hero screens. Read every string aloud and make error messages human and specific. Critique work against the team's best rather than the average, ask whether the result is the best the team has ever done, and ask whether anyone would sign their name inside the work. Treat excellence as a standard enforced by review rather than inspection, because tolerated mediocrity compounds and corner-cutting where nobody looks trains corner-cutting everywhere. Identify the ugliest screen as the real quality bar and look for plywood surfaces.
<!-- vpmodule:atom:end steve-jobs-design-review-back-of-fence -->
<!-- vpmodule:atom:begin steve-jobs-design-review-behavior -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-behavior
title: Judge design by how it works
summary: "Judge flows, speed and failure states rather than static appearance; review cold start, empty, offline and error recovery; set experience budgets such as a first screen under one second; and reject beauty that fights function."
capability_tags:
  - review-product-design
pattern_tags:
  - behavioral-design
conditions_applies_when: "Reviewing flows, latency and failure behavior."
conditions_does_not_apply_when: A static brand asset with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review walks the slowest and failing paths and names the latency budget.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L84-L111"
status: active
revision: 1
---

# Judge design by how it works

Judge design by behavior rather than appearance: evaluate flows, speed, failure states, interruptions, and sequences, and treat a beautiful product that stutters, loses work, or confuses on failure as badly designed. Review the slowest moments rather than only the happy path, including cold start, empty state, offline behavior, and error recovery. In a mockup review, demand the interaction and click through states rather than accepting static slides or stills. In a performance review, set experience budgets; the stated budget is first screen under 1 second or the review fails, and a 2-second wait is a design flaw wherever it lives in the stack. 'It just works' is a design specification requiring zero configuration, zero manual, and zero ceremony; reject beauty that fights function. For failure design, walk error, empty, and offline paths and verify that the user knows exactly what to do next, as when a payment fails.
<!-- vpmodule:atom:end steve-jobs-design-review-behavior -->
<!-- vpmodule:atom:begin steve-jobs-design-review-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-common-mistakes
title: Avoid the common review mistakes
summary: "Avoid reviewing only aesthetics, fixing by adding, consensus verdicts, reviewing specs and slides, good-enough verdicts, skipping unseen surfaces and cosplaying cruelty; apply the stated fix for each."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Checking a review for the listed anti-patterns.
conditions_does_not_apply_when: A finding already covered by another instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L227-L238"
status: active
revision: 1
---

# Avoid the common review mistakes

Avoid these seven review failure modes. (1) Reviewing only aesthetics fails because design is how it works and pretty-but-clunky products still fail users; walk flows, latency, and failure states. (2) Fixing problems by adding fails because each addition taxes attention and breeds complexity; subtract first and require additions to kill something. (3) Consensus verdicts fail because committees average ideas into mush; use one decider with wide input and a narrow decision. (4) Reviewing specs and slides fails because abstractions hide dealbreakers and let everyone imagine a different product; demand working demos on the real device. (5) 'Good enough' verdicts fail because mediocrity compounds into brand damage; use the binary insanely-great-or-not-done verdict. (6) Skipping unseen surfaces fails because users sense plywood and teams learn to cut corners; audit empty, error, settings, and email states. (7) Cosplaying cruelty fails because fear stops demos and candor and kills the feedback loop; be brutal about the work and decent to people.
<!-- vpmodule:atom:end steve-jobs-design-review-common-mistakes -->
<!-- vpmodule:atom:begin steve-jobs-design-review-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-core
title: Run a Jobs-style design review
summary: "Run design and product reviews from the customer experience, subtract until only the essential remains, and refuse to call anything done that is not insanely great."
capability_tags:
  - review-product-design
pattern_tags:
  - design-review-method
conditions_applies_when: Reviewing a product or feature with a Jobs-style design review.
conditions_does_not_apply_when: A code review or a visual-design audit.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review starts from the customer experience and ends with a done or not-done judgment.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L10-L13"
status: active
revision: 1
---

# Run a Jobs-style design review

Run design and product reviews the way Steve Jobs ran them: start from the customer experience, subtract until only the essential remains, and refuse to call anything done that isn't insanely great.
<!-- vpmodule:atom:end steve-jobs-design-review-core -->
<!-- vpmodule:atom:begin steve-jobs-design-review-demo -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-demo
title: Require a working demo
summary: "Review working artifacts rather than specs or slides, on the target device at target data scale; prototype the riskiest moment first, run competing demos to one verdict, and show honest state without hiding known breakage."
capability_tags:
  - review-product-design
pattern_tags:
  - demo-driven-review
conditions_applies_when: Deciding from a demo.
conditions_does_not_apply_when: A documentation-only deliverable.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: A working demo on the target device exists and the riskiest moment is covered.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L142-L171"
status: active
revision: 1
---

# Require a working demo

Review working artifacts, not specs or slideware: concrete demos expose truth that documents hide and force decisions by a decider reacting to the real thing. Review rules: ban slide-only reviews — require a Figma prototype or build; run reviews on the target device at target data scale because a phone UI judged on a projector lies; prototype the riskiest moment first because a demo of the easy 80% proves nothing; when competing ideas exist, run a demo derby and pick one — never ship a compromise of both; demo to the decider weekly (30 minutes replaces status docs). Review prompts: 'Don't tell me — show me. On the device.', 'Which of these two demos wins? Pick one; we're not shipping a compromise of both.', 'What's the riskiest assumption, and where's the demo that tests it?' Ethical boundary: demos must show honest state — a staged demo that hides known breakage is a lie with a UI.
<!-- vpmodule:atom:end steve-jobs-design-review-demo -->
<!-- vpmodule:atom:begin steve-jobs-design-review-focus -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-focus
title: Focus by saying no
summary: "Treat what not to build as equal to what to build, force-rank and cut below the top three, require a kill for every addition, include already-shipped deletions, and say no to scope but never to evidence."
capability_tags:
  - review-product-design
pattern_tags:
  - ruthless-focus
conditions_applies_when: "Reviewing a roadmap, scope or feature list."
conditions_does_not_apply_when: A bug fix that adds no scope.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names what was cut or killed this cycle and why.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L54-L83"
status: active
revision: 1
---

# Focus by saying no

Treat focus as an explicit decision to reject work: deciding what not to build is as important as deciding what to build, and innovation requires saying no to many good things. In a roadmap review, force-rank priorities and cut everything below #3; in scope creep, require a kill for every add; in a product-line review, collapse overlapping SKUs or tiers to one plan per customer type. A roadmap with no recently killed items is unexamined rather than focused, and saying no includes deleting features that already shipped because deletion is a feature. Say no to scope, never to evidence: killing a feature is strategy, while ignoring user pain that contradicts the vision is vanity.
<!-- vpmodule:atom:end steve-jobs-design-review-focus -->
<!-- vpmodule:atom:begin steve-jobs-design-review-principle -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-principle
title: Start from the customer experience
summary: "Review from what a customer sees, feels and accomplishes, working backwards to the technology; never review from the feature list, the org chart or the available technology."
capability_tags:
  - review-product-design
pattern_tags:
  - experience-backwards
conditions_applies_when: Framing a product review.
conditions_does_not_apply_when: A component-level code review.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the customer outcome before any feature or technology.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L14-L17"
status: active
revision: 1
---

# Start from the customer experience

Review every product starting from what a customer sees, feels, and accomplishes — work backwards to the technology; never review from the feature list, the org chart, or the technology that happened to be available. The governing standard is: design is not just what it looks like and feels like; design is how it works.
<!-- vpmodule:atom:end steve-jobs-design-review-principle -->
<!-- vpmodule:atom:begin steve-jobs-design-review-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-quick-diagnostic
title: Run the 7-row review diagnostic
summary: "Check the One Thing, three-step value, cold first experience, working demo, something removed, unseen-surface quality and team pride, with the stated action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick scored diagnostic of a product.
conditions_does_not_apply_when: A full review with a fix list.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all seven questions and names the action for every no.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L239-L250"
status: active
revision: 1
---

# Run the 7-row review diagnostic

Use the seven-row Quick Diagnostic as the scoring instrument; each row asks a question, and a 'No' triggers the stated action. (1) Can you state the One Thing this product must do in one sentence? If no, there is no focus and everything is the priority; write it and cut what does not serve it. (2) Does a new user reach core value in <=3 steps? If no, complexity is unconquered; map steps-to-value and remove steps rather than reorder them. (3) Did the reviewer experience it cold, as a customer? If no, you reviewed the team's story rather than the product; use it before the meeting with no walkthrough. (4) Is there a working demo on the real device? If no, you are approving an imagined product; reschedule until there is a demo. (5) Was anything removed this cycle? If no, the roadmap is accreting rather than focusing; add a cut list to every review. (6) Do error, empty, and edge states match hero-screen quality? If no, the back of the fence is plywood; audit and fix unseen surfaces. (7) Would the team proudly use it daily and sign it? If no, the bar is 'acceptable' rather than 'insanely great'; hold the binary verdict until pride is real.
<!-- vpmodule:atom:end steve-jobs-design-review-quick-diagnostic -->