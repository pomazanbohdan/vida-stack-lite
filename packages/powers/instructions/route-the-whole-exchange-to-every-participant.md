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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 1
---

# Route the whole exchange to every participant
It's one room, not parallel one-on-ones.
Every standing member hears everything said each round — the user's turn and every other persona's turn — even when it's not their turn to speak.
A persona sitting a round out is still in the room listening, so when it next speaks it's caught up: it can pick up a dropped thread, hold a grudge, call back.
Route the whole exchange to all of them each round; never hand a persona only the slice it's about to answer.
Skip this and they drift out of sync — separate consultations wearing a party's clothes.
