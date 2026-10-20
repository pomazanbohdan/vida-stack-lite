---
instruction_id: catch-up-the-members-the-channel-does-not-reach
title: Catch up the members the channel does not reach
summary: "When the channel is point to point, the lead relays the turns and brings an idle member up to date before it speaks again."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - context-relay
conditions_applies_when: "The participants talk to each other directly, so a member that sat a round out has not seen what passed."
conditions_does_not_apply_when: Every participant already receives the whole exchange.
artifact_contract_output_type: relayed-context
artifact_contract_required_data:
  - the members that missed a turn
  - what was relayed
  - the catch-up before the next turn
artifact_contract_verified_by: no member speaks about a turn it never received
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-agent-team.md
status: active
revision: 1
---

# Catch up the members the channel does not reach
Messaging is point-to-point — there's no shared feed, so a member that sat a round out hasn't seen what passed while it was idle.
Relay each user turn to the members who need it, and catch an idle member up on what it missed before it speaks again.
Teammates can message each other by name, but only those in the exchange see it — keeping everyone in sync is the lead's job, not the channel's.
