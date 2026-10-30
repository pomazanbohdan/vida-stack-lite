---
instruction_id: verify-the-launch-in-the-first-hour
title: Verify the launch in the first hour
summary: "Check the health endpoint, the error and the latency dashboards, the critical flow, the logs and the rollback in the first hour after the release."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A deployment has just gone out to production.
conditions_does_not_apply_when: The change has not been deployed yet.
artifact_contract_output_type: post-launch-check
artifact_contract_required_data:
  - the checks run
  - the results
  - the rollback state
artifact_contract_verified_by: every check of the first hour has a recorded result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Verify the launch in the first hour

## Post-Launch Verification

In the first hour after launch:

1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)

## Verification

After deploying:
- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready

## Red Flags

- No one monitoring the deploy for the first hour
