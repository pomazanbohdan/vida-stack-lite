---
instruction_id: decide-the-in-flight-duplicate
title: Decide what an in-flight duplicate gets
summary: "Choose the response for a duplicate that arrives while the first request is still running, and keep the key long enough to cover the longest retry path."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A second request with the same idempotency key can arrive while the first is still running.
conditions_does_not_apply_when: The call cannot be retried and has no effect.
artifact_contract_output_type: duplicate-and-retention-contract
artifact_contract_required_data:
  - the response for an in-flight duplicate
  - the retention window
  - the unknown outcome
artifact_contract_verified_by: the duplicate response is a deliberate choice and the retention outlives the longest retry path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Decide what an in-flight duplicate gets
**Decide what an in-flight duplicate gets.** The first request is still running when the second arrives — the common case under retry storms:

| Strategy | Response | Use when |
|---|---|---|
| Reject | `409 Conflict` | Client can retry later; simplest and safest |
| Wait | Block for the result, bounded | Caller needs it synchronously |
| Return pending | `202` + status URL | Long-running effects |

Never let the second caller through because the first "seems stuck". A stalled attempt whose fate is unknown is exactly when duplicating costs most.

**Every call has three outcomes, not two: success, failure, and _unknown_.** A timeout tells you nothing about whether the effect applied. Record the intent *before* calling out, so a crash between the call and the response leaves evidence something must resolve later — rather than a silently retried charge.

**Set retention from the longest retry chain**, not from disk cost. Keys must outlive every path that can re-deliver the same intent, including a dead-letter queue replayed a week later and any provider dispute window. A 24-hour key TTL behind a 7-day DLQ is a duplicate waiting to happen.
