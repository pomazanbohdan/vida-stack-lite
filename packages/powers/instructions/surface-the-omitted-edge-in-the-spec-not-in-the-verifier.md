---
instruction_id: surface-the-omitted-edge-in-the-spec-not-in-the-verifier
title: "Surface the omitted edge in the spec, not in the verifier"
summary: "An edge the author never wrote down is invisible to any verifier, so it is surfaced as an explicit requirement before the code exists."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A requirement is written and its edge cases are not yet stated.
conditions_does_not_apply_when: The requirement already states its boundaries and empty cases.
artifact_contract_output_type: edge-requirement
artifact_contract_required_data:
  - the omitted edge
  - the requirement that now states it
  - the check that can enforce it
artifact_contract_verified_by: the edge exists as a written requirement before the implementation starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/edge-probe.md
status: active
revision: 1
---

# Surface the omitted edge in the spec, not in the verifier
A goal-backward verifier only checks assertions that exist; an assertion only exists for a requirement that was written down.
The fix is not a better verifier or a confidence gate; confidence is uninformative across these regimes.
The fix is **spec completeness**: surface the omitted edge into an explicit, checkable assertion *before* any code exists, after which the verifier reliably catches it.
The differentiated move here is **placement, not technique**: apply the same edge taxonomy at the *spec* layer (front of pipeline, generating requirements)
