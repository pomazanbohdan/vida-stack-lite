---
instruction_id: roll-back-immediately-on-these-signals
title: Roll back immediately on these signals
summary: "Reverse the release at once when the error rate, the latency, the user reports, the data integrity or the security crosses the limit."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A release is live and one of the immediate-reversal signals appears.
conditions_does_not_apply_when: The signal is a slow degradation that the rollout thresholds handle as a hold.
artifact_contract_output_type: rollback-trigger
artifact_contract_required_data:
  - the signal observed
  - the measured value
  - the rollback action
artifact_contract_verified_by: the rollback starts without waiting for the next rollout stage
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Roll back immediately on these signals

### When to Roll Back

Roll back immediately if:
- Error rate increases by more than 2x baseline
- P95 latency increases by more than 50%
- User-reported issues spike
- Data integrity issues detected
- Security vulnerability discovered
