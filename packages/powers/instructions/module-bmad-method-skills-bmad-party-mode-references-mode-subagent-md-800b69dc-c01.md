---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-party-mode-references-mode-subagent-md-800b69dc-c01"
title: "bmad-method: skills/bmad-party-mode/references/mode-subagent.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-party-mode/references/mode-subagent.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-party-mode/references/mode-subagent.md\"}"
atom_ids:
  - constrain-the-form-and-not-the-reasoning
  - route-the-whole-exchange-to-every-participant
atom_count: 2
atoms: "[{\"atom_id\":\"constrain-the-form-and-not-the-reasoning\",\"file_sha256\":\"e978dba28d5cd1a606a368ab02c3c08ac70f6d678cbba8c18dbc84b55b463d2a\",\"content_sha256\":\"915b9596f59003d83a169889f76565d77b20307e7a518c8c222ef4670e97cf5e\",\"file_bytes\":1666,\"body_bytes\":488},{\"atom_id\":\"route-the-whole-exchange-to-every-participant\",\"file_sha256\":\"7469f687148b55f62a14793bc501ba19533e65042754a237fe446c1c519241c3\",\"content_sha256\":\"8fbf03d4c851a32269dbe4de653f81533c99fef1df0745448dfa07b1caaa3ad0\",\"file_bytes\":1797,\"body_bytes\":600}]"
carrier_sha256: 500391031abba1f071b96e2c4a0e567d4352291a59f0698318e7bf72ec53a173
carrier_bytes: 3748
revision: 1
status: active
---
<!-- vpmodule:atom:begin constrain-the-form-and-not-the-reasoning -->
---
instruction_id: constrain-the-form-and-not-the-reasoning
title: Constrain the form and not the reasoning
summary: "Bound the length and the stance of a reply and leave the substance to the worker, because scripted reasoning produces lifeless answers."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A delegated reply has to stay short, react to what was said, and still carry an independent point of view."
conditions_does_not_apply_when: The task is mechanical and the substance is fully specified anyway.
artifact_contract_output_type: bounded-reply
artifact_contract_required_data:
  - the length bound
  - the stance
  - the substance left to the worker
artifact_contract_verified_by: the reply is short and reactive and still reaches its own conclusion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Constrain the form and not the reasoning
Trust their *thinking*: let them decide what to read and how to reach a view; don't script their substance with do-and-don't checklists — that's what produces lifeless blobs.
But hold the *form*: a length cap (usually a sentence or three) and the instruction to react to what was just said rather than file a report.
Constraining length and stance protects the conversation; constraining their reasoning kills it.
Stay in character throughout
<!-- vpmodule:atom:end constrain-the-form-and-not-the-reasoning -->
<!-- vpmodule:atom:begin route-the-whole-exchange-to-every-participant -->
---
instruction_id: route-the-whole-exchange-to-every-participant
title: Route the whole exchange to every participant
summary: "Give every standing participant the whole round, not only the slice it is about to answer, or the participants drift out of step."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - shared-room-context
conditions_applies_when: Several standing participants take turns in the same exchange and are expected to stay in step.
conditions_does_not_apply_when: The participants run separate consultations that never read each other.
artifact_contract_output_type: shared-room
artifact_contract_required_data:
  - the participants
  - the whole exchange
  - the routing rule
  - the caught-up state
artifact_contract_verified_by: every participant received the user turn and every other turn of the round
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Route the whole exchange to every participant
It's one room, not parallel one-on-ones.
Every standing member hears everything said each round — the user's turn and every other persona's turn — even when it's not their turn to speak.
A persona sitting a round out is still in the room listening, so when it next speaks it's caught up: it can pick up a dropped thread, hold a grudge, call back.
Route the whole exchange to all of them each round; never hand a persona only the slice it's about to answer.
Skip this and they drift out of sync — separate consultations wearing a party's clothes.
<!-- vpmodule:atom:end route-the-whole-exchange-to-every-participant -->