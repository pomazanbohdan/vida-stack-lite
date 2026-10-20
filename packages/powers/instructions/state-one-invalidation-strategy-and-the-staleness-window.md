---
instruction_id: state-one-invalidation-strategy-and-the-staleness-window
title: State one invalidation strategy and the staleness window
summary: "Choose TTL, event-based or versioned keys, and state the acceptable staleness window explicitly."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A cached value exists and has to be allowed to go stale.
conditions_does_not_apply_when: Nothing is cached.
artifact_contract_output_type: invalidation-policy
artifact_contract_required_data:
  - the chosen strategy
  - the acceptable staleness window
artifact_contract_verified_by: the staleness window is stated and exactly one invalidation strategy is chosen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 2
---

# State one invalidation strategy and the staleness window

Choose one invalidation strategy, not three:

| Strategy | Trade-off |
|---|---|
| TTL | Simplest. You accept staleness up to the TTL, so state the acceptable window explicitly |
| Event or tag based | Fresh on write, but writers now have to know the cache topology |
| Versioned keys (`user:42:profile:v7`) | Never invalidate, just stop reading old keys. Costs memory until eviction |

State the acceptable staleness window explicitly.
