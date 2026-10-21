---
instruction_id: reject-a-malformed-bound-rather-than-guessing-at-it
title: Reject a malformed bound rather than guessing at it
summary: "A bound that is not exactly what was asked for is refused with a structured error, because guessing would silently select a different set."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A bound is parsed and it is not in the accepted form.
conditions_does_not_apply_when: The bound is exactly in the accepted form.
artifact_contract_output_type: strict-bound-validation
artifact_contract_required_data:
  - the accepted form
  - what a guess would select instead
  - how the refusal is reported
artifact_contract_verified_by: the malformed bound was refused and the set was not silently changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=scripts/changeset/README.md
status: active
revision: 1
---

# Reject a malformed bound rather than guessing at it
- Strict validation is deliberate. Coercing a malformed bound such as `1.42.x` to `1.42.0` would silently change which releases the range selects, so a malformed bound is rejected early with a structured error rather than guessed at.
