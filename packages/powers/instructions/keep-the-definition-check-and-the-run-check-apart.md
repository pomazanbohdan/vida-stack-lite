---
instruction_id: keep-the-definition-check-and-the-run-check-apart
title: Keep the definition check and the run check apart
summary: "Verifying that a definition still matches the policy and attesting that one run produced the value are two different checks: the first is recorded in the corpus, the second happens on every run."
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A consumer has to decide whether a value may be shown.
conditions_does_not_apply_when: The corpus holds no definition that a policy could be checked against.
artifact_contract_output_type: check-separation
artifact_contract_required_data:
  - the definition check
  - the run check
  - where each one is recorded
artifact_contract_verified_by: the two checks are named apart and each is recorded where it belongs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Keep the definition check and the run check apart
`verified` confirms the *definition* still matches policy.
It is doc-level, slow, and recorded in the bundle.
Attestation confirms a single *run* produced the value the sanctioned way.
It is per-call, runtime, and not stored in the bundle.
A concept with a stale definition can still attest cleanly, and a freshly-verified definition still requires attestation on each run, which is why both are needed.
