---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-step-03-walkthrough-md-5e896dd3-c01"
title: "bmad-method: skills/bmad-walkthrough/step-03-walkthrough.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-walkthrough/step-03-walkthrough.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/step-03-walkthrough.md\"}"
atom_ids:
  - answer-in-the-session-with-concrete-findings
  - answer-the-question-in-a-fresh-subagent
  - ask-before-committing-on-a-dirty-tree
  - drop-the-status-chatter
  - guess-the-follow-through-and-ask-before-doing-it
  - help-the-reviewer-test-and-drive-the-target
  - present-the-next-block-before-recording-the-previous-one
  - record-what-was-actually-tested
atom_count: 8
atoms: "[{\"atom_id\":\"answer-in-the-session-with-concrete-findings\",\"file_sha256\":\"00c95a470a5dcb600b84c38a54f2df97033b296a1ed265df00a97f056202802b\",\"content_sha256\":\"13956aebd4f5dcf60284edf3efa2a6df6ea9a9c2629300c7590e9bc71168e990\",\"file_bytes\":1412,\"body_bytes\":220},{\"atom_id\":\"answer-the-question-in-a-fresh-subagent\",\"file_sha256\":\"425eac2514ada816d6ccc58f874a654e4ace5bebd6fc9bd61152f90bb7fb6d61\",\"content_sha256\":\"b2a2e4ecd96582085b82e51c1496c1bef00734e94e380dca75c410a1d394bce1\",\"file_bytes\":1329,\"body_bytes\":245},{\"atom_id\":\"ask-before-committing-on-a-dirty-tree\",\"file_sha256\":\"99d972f57f13d4951592d360fab7bc7bfdc8f7cc95404995603a56f163a3b2ca\",\"content_sha256\":\"b8e6d5467b5208b84ff721f02ef5129cf757525092bd297296c2c0668b8a275e\",\"file_bytes\":1226,\"body_bytes\":161},{\"atom_id\":\"drop-the-status-chatter\",\"file_sha256\":\"8842ab959a73f8b406c3bf1b438339f7e145e7e9f24a5a1796181271c284ecc2\",\"content_sha256\":\"8fc8e958281a1408371b83a92c385c82c580dc760374c5e2f7a4cc3937db1db6\",\"file_bytes\":1103,\"body_bytes\":144},{\"atom_id\":\"guess-the-follow-through-and-ask-before-doing-it\",\"file_sha256\":\"c10d83aaaf6a496bab8ef452aa419f8aa9f589319e2bd1e47e9c66a7339c2f1d\",\"content_sha256\":\"11360642b61a1bbe21f54e968f701c53ce953de5691734260d1ee6012d4297f2\",\"file_bytes\":1461,\"body_bytes\":361},{\"atom_id\":\"help-the-reviewer-test-and-drive-the-target\",\"file_sha256\":\"65f364cf899cbb6752b5bc9ce6ccee78dfaa8ba03c4d14b72430233c7afa45fd\",\"content_sha256\":\"dd51e07a8a16cc81dffa393d50806f2bfa13f963f89701e3818afaa8e36f8ced\",\"file_bytes\":2199,\"body_bytes\":1015},{\"atom_id\":\"present-the-next-block-before-recording-the-previous-one\",\"file_sha256\":\"fb82585c5cf87b525e47f7d8bceb8a5cba23c56d5504701b7bca776f34cecd37\",\"content_sha256\":\"5ae6a24363b3f4617f58344b28be3f771476bd0cad2444589ff43fe2ac2fafb2\",\"file_bytes\":1454,\"body_bytes\":288},{\"atom_id\":\"record-what-was-actually-tested\",\"file_sha256\":\"6fd4cde0925f717706645bd713c5019dffff9c21f0efe7b14d75340dd6395aee\",\"content_sha256\":\"a5531910ba718503a72b5721051d9c7425027b72cdc8a15979a5d77fcfb1524a\",\"file_bytes\":1226,\"body_bytes\":206}]"
carrier_sha256: b4e187cbcad9d506fc0cbf3f8ed042e35d36ffec37d662c76c8899f7279a6802
carrier_bytes: 12515
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-in-the-session-with-concrete-findings -->
---
instruction_id: answer-in-the-session-with-concrete-findings
title: Answer in the session with concrete findings
summary: An informal pass answers in the session and reports concrete findings with clickable references.
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer asks what you think about the area under discussion.
conditions_does_not_apply_when: The reviewer asked for a formal review or a second opinion.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the concrete findings
  - the clickable reference of each finding
artifact_contract_verified_by: every finding carries a clickable reference
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a reviewer-response sequence for an unspecified area, while its conditions name no subject domain; no listed domain can be grounded from this source."
---

# Answer in the session with concrete findings
When the reviewer asks a question in the session, look at the requested area and answer it with concrete findings and clickable references, without any formal review skill.
<!-- vpmodule:atom:end answer-in-the-session-with-concrete-findings -->
<!-- vpmodule:atom:begin answer-the-question-in-a-fresh-subagent -->
---
instruction_id: answer-the-question-in-a-fresh-subagent
title: Answer the question in a fresh subagent
summary: A second opinion is the same question asked in a fresh subagent that has not seen the review conversation.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The reviewer asks for a second opinion on the block under discussion.
conditions_does_not_apply_when: The reviewer asked for a formal review instead.
artifact_contract_output_type: second-opinion
artifact_contract_required_data:
  - the question that was asked
  - the answer from the fresh subagent
artifact_contract_verified_by: the subagent that answered had no access to the review conversation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Answer the question in a fresh subagent
Second opinion: Put a question to a fresh subagent that does not have this review's conversation. Do not use any formal review skills. Suggest it when your own read may be anchored by the review so far.
<!-- vpmodule:atom:end answer-the-question-in-a-fresh-subagent -->
<!-- vpmodule:atom:begin ask-before-committing-on-a-dirty-tree -->
---
instruction_id: ask-before-committing-on-a-dirty-tree
title: Ask before committing on a dirty tree
summary: "A dirty tree is a question for the reviewer, not a decision for you."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy
conditions_applies_when: A block is accepted while the working tree still holds uncommitted changes.
conditions_does_not_apply_when: "The working tree is clean, or the reviewer already asked for the commit."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the state of the tree
  - the question asked about committing
artifact_contract_verified_by: the commit happens only after the reviewer answered the question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ask before committing on a dirty tree
If the tree is dirty, ask the user whether to commit.
A dirty tree is generally undesirable; the user can still move on.
<!-- vpmodule:atom:end ask-before-committing-on-a-dirty-tree -->
<!-- vpmodule:atom:begin drop-the-status-chatter -->
---
instruction_id: drop-the-status-chatter
title: Drop the status chatter
summary: No status updates on later turns unless the reviewer asks where they are.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A review continues over several turns with the same block.
conditions_does_not_apply_when: The reviewer asked where the review currently stands.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the turn content
artifact_contract_verified_by: no turn carries a status remark the reviewer did not ask for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Drop the status chatter
Do not add status chatter ("still current", "waiting on you") on later turns unless the reviewer asks where they are.
<!-- vpmodule:atom:end drop-the-status-chatter -->
<!-- vpmodule:atom:begin guess-the-follow-through-and-ask-before-doing-it -->
---
instruction_id: guess-the-follow-through-and-ask-before-doing-it
title: Guess the follow-through and ask before doing it
summary: The wrap-up names the likely follow-through of the work and waits for the reviewer to authorize it.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: Every block of the review has been gone through.
conditions_does_not_apply_when: "Blocks remain, or the reviewer already said what the follow-through is."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the guessed follow-through
  - the question asked about it
artifact_contract_verified_by: the follow-through did not happen before the reviewer said so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Guess the follow-through and ask before doing it
When every block has been gone through, suggest wrap-up.
The review is finished. Guess the follow-through this work was for (e.g. merge the PR, write the review, commit and push if they edited) and ask the user if that is what they want. Do not do it until they say so.
Do not end with only a summary in chat.
<!-- vpmodule:atom:end guess-the-follow-through-and-ask-before-doing-it -->
<!-- vpmodule:atom:begin help-the-reviewer-test-and-drive-the-target -->
---
instruction_id: help-the-reviewer-test-and-drive-the-target
title: Help the reviewer test and drive the target
summary: "Help test the part under discussion: name the useful checks, run what you can, and drive the app so the reviewer sees it work."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The reviewer picks the move that tests the part under discussion.
conditions_does_not_apply_when: The reviewer picked a move that does not exercise the target.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the useful checks and their expected behavior
  - the observations that needed the reviewer
artifact_contract_verified_by: "the checks that could be run were run, and the ones that needed the reviewer are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Help the reviewer test and drive the target
Test: Help test the part under discussion. Identify useful checks and expected behavior, run what you can, and guide the user through observations that need them. Suggest it when behavior is easier to check than to reason out, or the tests do not cover it.
Drive: Start the app and tell the user which buttons to push to see the target do its thing. Suggest it when the target is observable and the user has the app at hand.
Demo: Exercise the change yourself and show the user what happened — screenshots or a transcript, in a rendered view the host offers; say which. Save them in the walkthrough folder and link them from the log. Suggest it when the target is observable and the user would rather watch than drive.
Draw: Diagram the block's mechanism, showing only what the linked code does, in a rendered view the host offers; say which. Save the source in the walkthrough folder and link it from the log. Suggest it when the mechanism has several moving parts.
<!-- vpmodule:atom:end help-the-reviewer-test-and-drive-the-target -->
<!-- vpmodule:atom:begin present-the-next-block-before-recording-the-previous-one -->
---
instruction_id: present-the-next-block-before-recording-the-previous-one
title: Present the next block before recording the previous one
summary: "When a block is done, the next block comes first so the reviewer can keep going, and the previous one is recorded silently afterwards."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer has said that a block is done and more blocks remain.
conditions_does_not_apply_when: No further block remains after the one that was accepted.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the next block
  - the updated state of the previous block
artifact_contract_verified_by: the next block was offered before the previous block was checked in the narrative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Present the next block before recording the previous one
When they say the block is done:
- present the next block first so they can keep going.
- then record that the previous block is done: check it in the narrative silently, and revise the remaining narrative if it needs to change.
<!-- vpmodule:atom:end present-the-next-block-before-recording-the-previous-one -->
<!-- vpmodule:atom:begin record-what-was-actually-tested -->
---
instruction_id: record-what-was-actually-tested
title: Record what was actually tested
summary: "The record names the checks that ran, their results, and what is still unverified."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A test move finished and the outcome has to be written down.
conditions_does_not_apply_when: Nothing was tested in this move.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - what was actually tested
  - the results
  - anything still unverified
artifact_contract_verified_by: the entry names the unverified part instead of leaving it out
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Record what was actually tested
Record what was actually tested, the results, and anything still unverified.
For a Demo or Draw move, save the artifact in the walkthrough folder and link it from the log.
<!-- vpmodule:atom:end record-what-was-actually-tested -->