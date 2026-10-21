---
instruction_id: measure-the-context-and-start-a-fresh-session-before-it-degrades
title: Measure the context and start a fresh session before it degrades
summary: "The running session is asked for its context utilisation and the result is read as three bands: comfortable, a warning to start a fresh session, and a critical point past which the reasoning quality degrades."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
  - context-degradation-policy
conditions_applies_when: "The utilisation of the running session's context can be measured."
conditions_does_not_apply_when: The run is short and the context cannot fill up.
artifact_contract_output_type: context-state-report
artifact_contract_required_data:
  - the measured utilisation of the session
  - the band it falls into
  - the action the band calls for
artifact_contract_verified_by: "the measured utilisation is reported with its band, and the warning band names a fresh session"
compatibility_excludes:
  - adjust-the-behaviour-to-the-context-degradation-signals
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/health.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-health/SKILL.md
status: active
revision: 3
---

# Measure the context and start a fresh session before it degrades

The workflow asks for the model's tokensUsed + contextWindow

| Utilization | State | Action |
|---|---|---|
| `< 60%` | healthy | no action — context is comfortable |
| `60% – 70%` | warning | recommend a fresh session instead of continuing |
| `≥ 70%` | critical | reasoning quality may degrade past the fracture point |
