---
instruction_id: anchor-an-identity-check-at-both-ends
title: Anchor an identity check at both ends
summary: "A check that identifies the tool in use matches the whole payload, not a substring, and its result is a value a later step can read."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A tool has to prove that it is the tool it claims to be.
conditions_does_not_apply_when: There is only one candidate and no other package publishes the same name.
artifact_contract_output_type: identity-check
artifact_contract_required_data:
  - the anchored match
  - the status value the check returns
  - the failure the check refuses
artifact_contract_verified_by: "a payload that merely contains the expected name is rejected, and the status is a value"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/runtime-identity.md
status: active
revision: 1
---

# Anchor an identity check at both ends
The match is anchored at both ends, not a substring.
The status is a value, not prose.
Closing on `}` costs nothing in future-proofing: a JSON object's own brace is always the last character, whatever type the last value has.
The failure was silent in both directions — the workflow could not tell it had reached the wrong handler, and the handler could not tell it had been called by a workflow written for a different contract
