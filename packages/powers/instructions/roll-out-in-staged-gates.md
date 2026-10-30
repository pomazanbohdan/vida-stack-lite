---
instruction_id: roll-out-in-staged-gates
title: Roll out in staged gates
summary: "Grow the exposure of a change step by step, with a monitoring window and a way back at every step."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - staged-exposure
conditions_applies_when: A change is released to users and the release can be widened in steps.
conditions_does_not_apply_when: "The change cannot be exposed in stages, such as a one-off internal script."
artifact_contract_output_type: staged-rollout
artifact_contract_required_data:
  - the ordered stages
  - the monitoring window per stage
  - the way back to the previous stage
artifact_contract_verified_by: each stage was monitored for its window before the next one started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Roll out in staged gates

## Staged Rollout

### The Rollout Sequence

1. DEPLOY to staging
   └── Full test suite in staging environment
   └── Manual smoke test of critical flows

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment succeeded (health check)
   └── Check error monitoring (no new errors)

3. ENABLE for team (flag ON for internal users)
   └── Team uses the feature in production
   └── 24-hour monitoring window

4. CANARY rollout (flag ON for 5% of users)
   └── Monitor error rates, latency, user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── Advance only if all thresholds pass

5. GRADUAL increase (25% -> 50% -> 100%)
   └── Same monitoring at each step
   └── Ability to roll back to previous percentage at any point

6. FULL rollout (flag ON for all users)
   └── Monitor for 1 week
   └── Clean up feature flag

## Red Flags

- Big-bang releases (everything at once, no staging)

## Common Rationalizations

"It works in staging, it'll work in production"
Production has different data, traffic patterns, and edge cases. Monitor after deploy.
