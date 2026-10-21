---
instruction_id: surface-the-attestation-verdict-instead-of-dropping-it
title: Surface the attestation verdict instead of dropping it
summary: "A failing attestation is surfaced and never silently dropped, and a successful verdict is shown so that the trust in the value is visible."
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A run has been attested and the result is about to be shown.
conditions_does_not_apply_when: Nothing was attested.
artifact_contract_output_type: attestation-verdict
artifact_contract_required_data:
  - the verdict
  - where the verdict is surfaced
artifact_contract_verified_by: a failing verdict was surfaced and a passing verdict was shown
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Surface the attestation verdict instead of dropping it
- SHOULD derive trust tiers and staleness only from the fields specified here, and SHOULD surface, not silently drop, a failing attestation (§10.5).
Refuse to display a failing attestation; warn or refuse when `now >= stale_after`.
On success, surface the verdict (for example a link to the job log) so trust is visible.
