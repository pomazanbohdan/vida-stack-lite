---
instruction_id: write-the-rollback-plan-before-deploying
title: Write the rollback plan before deploying
summary: "Write the trigger conditions, the rollback steps, the database considerations and the time to roll back before the deployment happens."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A deployment is planned and may have to be reversed.
conditions_does_not_apply_when: The deployment cannot change data or behaviour and is reversed by redeploying an unchanged build.
artifact_contract_output_type: rollback-plan
artifact_contract_required_data:
  - trigger conditions
  - rollback steps
  - database considerations
  - time to rollback
artifact_contract_verified_by: the plan exists before the deployment and names a way back for every change it makes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 1
---

# Write the rollback plan before deploying
Every deployment needs a rollback plan before it happens:

## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: <verified command or runbook link>
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes

## Red Flags

- Deploying without a rollback plan

## Common Rationalizations

"Rolling back is admitting failure"
Rolling back is responsible engineering. Shipping a broken feature is the failure.
