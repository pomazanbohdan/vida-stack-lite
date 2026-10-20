---
instruction_id: gate-the-rollout-on-metric-thresholds
title: Gate the rollout on metric thresholds
summary: "Decide whether to advance, hold or roll back from thresholds on error rate, latency, client errors and business metrics."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "A staged rollout needs a decision to advance, to hold or to reverse at the next step."
conditions_does_not_apply_when: The metrics have no baseline to compare against yet.
artifact_contract_output_type: rollout-decision
artifact_contract_required_data:
  - the metric values
  - the baseline
  - the threshold band
  - the decision
artifact_contract_verified_by: "the decision names the metric, the band it falls into and the stage it applies to"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 1
---

# Gate the rollout on metric thresholds

### Rollout Decision Thresholds

Use these thresholds to decide whether to advance, hold, or roll back at each stage:

| Metric | Advance (green) | Hold and investigate (yellow) | Roll back (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |
