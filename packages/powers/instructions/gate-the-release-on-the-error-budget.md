---
instruction_id: gate-the-release-on-the-error-budget
title: Gate the release on the error budget
summary: "Let the remaining error budget decide whether the release ships, slows down or stops."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A service has an error budget and a release is proposed.
conditions_does_not_apply_when: The service has no error budget or no defined allowance for failure.
artifact_contract_output_type: budget-gate-decision
artifact_contract_required_data:
  - the remaining budget
  - the band it falls into
  - the action
artifact_contract_verified_by: the action matches the band the remaining budget falls into
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 1
---

# Gate the release on the error budget

## Error Budget Release Gate

Your service's error budget — the fraction of requests or time your SLO allows to fail — determines whether it's safe to ship. Use it as an objective gate — not a negotiation:

Budget remaining > 20%  →  Ship normally; monitor closely
Budget remaining 0–20%  →  Slow rollouts only; no high-risk changes
Budget exhausted        →  Freeze feature work; focus entirely on reliability
Budget resets           →  Resume normal pace; bake in the fix that recovered it

A high burn rate during a canary (consuming budget faster than the baseline pace) is a **hold** signal in the rollout thresholds table above — treat it the same as an elevated error rate.

## Red Flags

- Error budget exhausted but feature work continues unchanged

## Common Rationalizations

"The error rate looks fine, let's keep shipping"
Check the burn rate, not just the current error rate. Consuming budget faster than baseline is a hold signal even when individual thresholds are green.
