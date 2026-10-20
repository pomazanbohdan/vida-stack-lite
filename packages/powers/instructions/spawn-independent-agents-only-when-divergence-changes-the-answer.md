---
instruction_id: spawn-independent-agents-only-when-divergence-changes-the-answer
title: Spawn independent agents only when divergence changes the answer
summary: Hand a round to real independent agents when the value is in uncoloured disagreement; voice it inline for everything else.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - spawn-on-divergence
conditions_applies_when: A round of a multi-voice exchange has to be produced either by one voice or by several independent ones.
conditions_does_not_apply_when: The work is a single task with one answer and no round to speak in.
artifact_contract_output_type: spawn-decision
artifact_contract_required_data:
  - the round
  - the independence test
  - the decision
  - the reason
artifact_contract_verified_by: an independent agent was spawned only for a round where the divergence was the point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-auto.md
status: active
revision: 1
---

# Spawn independent agents only when divergence changes the answer
Spawn independent agents when divergent, uncolored thinking is the value of the round:
A genuine evaluation, review, or critique — the kind that fails if one mind voices every side and they drift into agreement (code review, red-team, a hard look at a plan).
The personas would plausibly reach *different* conclusions, and that divergence is the point.
The user asked someone to dig in, analyze, or research — depth earned by a direct ask.
Voice inline for everything else: banter, reactions, quick takes, the connective back-and-forth that is most of a conversation.
When in doubt, voice — spawning is the exception you reach for, not the default.
