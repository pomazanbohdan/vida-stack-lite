---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-party-mode-skill-md-637f8fa2-c01"
title: "bmad-method: skills/bmad-party-mode/SKILL.md module"
summary: "Carrier for 6 atomic instructions from bmad-method:skills/bmad-party-mode/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-party-mode/SKILL.md\"}"
atom_ids:
  - keep-the-cast-alive-until-the-session-ends
  - leave-the-conflict-unresolved
  - make-the-voices-unequal-and-rotate-the-spotlight
  - pull-the-user-into-the-exchange
  - push-the-clash-until-it-earns-its-keep
  - weave-the-answers-into-one-conversation
atom_count: 6
atoms: "[{\"atom_id\":\"keep-the-cast-alive-until-the-session-ends\",\"file_sha256\":\"3173cf99d60ca0dbd49f9b9cf351f3325e37ee64e9c49dac12b9bea87f7bde54\",\"content_sha256\":\"b50a19c0459772d309b0e34c70faf1e00d20b43f5c5047fdbdcc3105ec9cfefd\",\"file_bytes\":1691,\"body_bytes\":437},{\"atom_id\":\"leave-the-conflict-unresolved\",\"file_sha256\":\"622503d9da38764c96e2b473cc1d015b17fe4cfcd473714605e48782d2978fe7\",\"content_sha256\":\"e4b167ed1c0eddb55056cea53320154e7a3408263588fc387d53cdf34aef51d7\",\"file_bytes\":1415,\"body_bytes\":289},{\"atom_id\":\"make-the-voices-unequal-and-rotate-the-spotlight\",\"file_sha256\":\"7f1b05f335cac6de83bb33980cedb04c2350a37a1610767fc064db98831f13ab\",\"content_sha256\":\"d07540717ad067f05a022171f3c0aa6ca316affc5c4d980b7197f46f50929f55\",\"file_bytes\":1549,\"body_bytes\":231},{\"atom_id\":\"pull-the-user-into-the-exchange\",\"file_sha256\":\"f2af30c101e9d2f3fd884652ba91af7ee3db9282e827623a51ee02b6a4f13f02\",\"content_sha256\":\"ecb48d5e94f467bbdb401525b57efb74b83a64b24c6530f70f2cec4fa437a4ac\",\"file_bytes\":1377,\"body_bytes\":241},{\"atom_id\":\"push-the-clash-until-it-earns-its-keep\",\"file_sha256\":\"ff92df216d965fc39628d8f217f37c5f975cdfd809405d5a77bf92515c88db8e\",\"content_sha256\":\"3bafcaa4ebaf18a0f29271f171be52441529fa204d603a5ddfa0c75f187ec7a7\",\"file_bytes\":1528,\"body_bytes\":240},{\"atom_id\":\"weave-the-answers-into-one-conversation\",\"file_sha256\":\"6846b3561951af39230e55c8fee8828602fe021eecf0a2cb114be0aa0a1d0d5e\",\"content_sha256\":\"cf7fcfcf6b03bdbaef2e9323040512d4745d2d9c5b5f44465b33ee94cf47ffd8\",\"file_bytes\":2065,\"body_bytes\":748}]"
carrier_sha256: 2396cb27a54b070cc722e20eca78c79aa11c9671f84f7861580167d30561c157
carrier_bytes: 10426
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-cast-alive-until-the-session-ends -->
---
instruction_id: keep-the-cast-alive-until-the-session-ends
title: Keep the cast alive until the session ends
summary: "A participant that finished the task it was given is idle, not done; release it only when the session ends."
capability_tags:
  - coordinate-program
pattern_tags:
  - standing-cast
conditions_applies_when: Long-lived participants are kept for a whole session and the first request has already been answered.
conditions_does_not_apply_when: The work is a single bounded dispatch that ends with its answer.
artifact_contract_output_type: standing-cast-state
artifact_contract_required_data:
  - the live participants
  - the idle ones
  - the release point
artifact_contract_verified_by: no participant was closed because the first request was served
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/mode-subagent.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the cast alive until the session ends
A member that finished the one thing you handed it is **idle, not done** — don't close, retire, or disband it.
Serving the opening intent doesn't end the party; only the user ending it does
Release agents only at wrap-up.
A served opening intent means *what's next?*, never *we're finished*: don't wrap up, disband the room, or close spawned agents just because the first ask is satisfied.
<!-- vpmodule:atom:end keep-the-cast-alive-until-the-session-ends -->
<!-- vpmodule:atom:begin leave-the-conflict-unresolved -->
---
instruction_id: leave-the-conflict-unresolved
title: Leave the conflict unresolved
summary: "Let the disagreement stand: do not reconcile the competing voices or tie the disagreement into a bow."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - preserved-disagreement
conditions_applies_when: Participants hold conflicting positions and the result is meant to show the conflict.
conditions_does_not_apply_when: The task is to reach one decision and the disagreement is already settled.
artifact_contract_output_type: unresolved-disagreement
artifact_contract_required_data:
  - the conflicting positions
  - the unreconciled gap
  - the point of disagreement
artifact_contract_verified_by: the disagreement is still visible in the result and no consensus was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Leave the conflict unresolved
They clash, and you don't resolve it.
Challenge, push back hard, get heated when it's warranted; alliances and factions form.
Your instinct is to reconcile the voices and tie a bow — resist it.
Clean consensus that took no effort is where the party dies.
<!-- vpmodule:atom:end leave-the-conflict-unresolved -->
<!-- vpmodule:atom:begin make-the-voices-unequal-and-rotate-the-spotlight -->
---
instruction_id: make-the-voices-unequal-and-rotate-the-spotlight
title: Make the voices unequal and rotate the spotlight
summary: "The voices are not equal and not balanced: one dominates, one drags the talk back, and the spotlight moves from round to round."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - uneven-voices
conditions_applies_when: Several participants speak in the same round and the exchange has to stay alive.
conditions_does_not_apply_when: "There is a single speaker, or the participants are deliberately interchangeable."
artifact_contract_output_type: uneven-cast
artifact_contract_required_data:
  - the dominating voice
  - the recurring one
  - who holds the spotlight in this round
artifact_contract_verified_by: no round is evenly distributed and the spotlight changed since the last one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body prescribes panel voice and spotlight style but identifies no substantive domain or user-facing design context; assigning design-ux or product would be inferred.
---

# Make the voices unequal and rotate the spotlight
Voices are unequal and idiosyncratic: someone dominates, someone keeps dragging it back to their pet topic.
Vary who's in the spotlight round to round.
A balanced panel is boring.
<!-- vpmodule:atom:end make-the-voices-unequal-and-rotate-the-spotlight -->
<!-- vpmodule:atom:begin pull-the-user-into-the-exchange -->
---
instruction_id: pull-the-user-into-the-exchange
title: Pull the user into the exchange
summary: Talk to the reader and put the question back to them instead of running the discussion as a panel they watch.
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - collaborative-dialogue
conditions_applies_when: Several perspectives are presented to a person who is taking part in the exchange.
conditions_does_not_apply_when: The result is a report for a reader who is not in the conversation.
artifact_contract_output_type: participatory-exchange
artifact_contract_required_data:
  - the question put to the reader
  - the challenge to the reader
  - the reply that waits for an answer
artifact_contract_verified_by: the reader is addressed directly and a question is returned to them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Pull the user into the exchange
Pull the user into the room.
Characters talk *to* them (and each other) — challenge, tease, put a question back.
They're a guest who got pulled into the argument, not someone running a panel from outside.
<!-- vpmodule:atom:end pull-the-user-into-the-exchange -->
<!-- vpmodule:atom:begin push-the-clash-until-it-earns-its-keep -->
---
instruction_id: push-the-clash-until-it-earns-its-keep
title: Push the clash until it earns its keep
summary: Keep pushing the disagreement until it surfaces an angle that no single participant would have reached alone.
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - dialectical-discussion
conditions_applies_when: Several perspectives are arguing and the point of running them together is to go beyond any one of them.
conditions_does_not_apply_when: The participants are confirming one conclusion and nothing new can come out of the exchange.
artifact_contract_output_type: earned-clash
artifact_contract_required_data:
  - the clash
  - the angle it surfaced
  - the participants it took
artifact_contract_verified_by: the result contains an angle no single participant would have reached on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body states a generic collaboration goal without identifying a supported engineering, design, product, business, research or operations subject."
---

# Push the clash until it earns its keep
Make the collision earn its keep.
Push the voices until their clash surfaces an angle no single one of them (or you) would've reached alone.
That's the whole point of more than one mind in the room.
<!-- vpmodule:atom:end push-the-clash-until-it-earns-its-keep -->
<!-- vpmodule:atom:begin weave-the-answers-into-one-conversation -->
---
instruction_id: weave-the-answers-into-one-conversation
title: Weave the answers into one conversation
summary: "Deliver several voices as a single exchange with the turns interleaved, never as a row of separate answers."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - multi-voice-delivery
conditions_applies_when: Several voices answer in the same reply and the answer has to read as one exchange.
conditions_does_not_apply_when: "Only one voice speaks, or the result is a table of separate findings rather than a dialogue."
artifact_contract_output_type: woven-exchange
artifact_contract_required_data:
  - the turns
  - the order of the turns
  - the connective tissue
  - the preserved substance
artifact_contract_verified_by: the reply reads as one exchange and no speaker is paraphrased in the third person
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Weave the answers into one conversation
Present a single conversation — turns as `{icon} **{name}:**`, back to back — not a row of answers.
It reads like people talking, not a report.
Short turns, real reactions, banter, momentum — a group chat, not a stack of memos.
Brevity by default: a persona goes long only when asked.
Add staging and connective tissue, but never change what a persona argued, and never paraphrase their speech in third person; let them say it.
Weave the delivery, keep the substance.
Reorder turns so a rebuttal lands right after what it rebuts,
add the connective phrasing real talk has
and let one persona pick up a thread another dropped.
Never change what an agent argued — weave delivery, preserve substance.
<!-- vpmodule:atom:end weave-the-answers-into-one-conversation -->