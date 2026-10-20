---
instruction_id: honour-an-idempotency-key
title: Honour an idempotency key
summary: "Derive the key from the intent, claim it atomically, and guard the payload against a reused key."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A state-changing call can be retried by the client or by an intermediary.
conditions_does_not_apply_when: The call is safe to repeat by construction and has no effect.
artifact_contract_output_type: idempotency-contract
artifact_contract_required_data:
  - the key derivation
  - the atomic claim
  - the payload guard
artifact_contract_verified_by: a repeated request with the same key applies the effect once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Honour an idempotency key
Accepting an `Idempotency-Key` is the contract. Honouring it is the implementation, and it is where the money is lost — a key the server accepts but handles carelessly is worse than no key at all, because the client now believes retrying is safe.

**Derive the key from the intent, not the attempt.** The key must be stable across retries of one intent and different across distinct intents:

The key comes from the client or the initiating event — never from the layer doing the retrying.

**Claim atomically. A check followed by an act is a race:**

The unique constraint *is* the mechanism. A store that cannot enforce uniqueness in one operation cannot back this.

**Guard the payload.** Same key with a different body is a client bug, and must fail loudly rather than serving the first response to a second request:
