---
instruction_id: derive-the-trust-tier-from-the-verifier
title: Derive the trust tier from the verifier
summary: "The trust tier of a document is derived from who verified it: nobody, only machines, or a person."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - trust-signals
conditions_applies_when: A consumer has to say how far it trusts a document.
conditions_does_not_apply_when: The consumer only needs the content of the document.
artifact_contract_output_type: trust-tier
artifact_contract_required_data:
  - the verification entries
  - the tier derived from them
artifact_contract_verified_by: the tier follows from the verifiers and a single verifier is read as one entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Derive the trust tier from the verifier
Consumers derive a trust tier from `verified`, lowest to highest:
- No `verified` key ⇒ **unverified**.
- `verified` by non-`human:` actors only ⇒ **machine-confirmed**.
- `verified` by a `human:<id>` actor ⇒ **human-reviewed**.
A single verifier MAY be written as one `{ by, at }` mapping without the list dash.
Consumers MUST treat a bare mapping as a one-element list:
