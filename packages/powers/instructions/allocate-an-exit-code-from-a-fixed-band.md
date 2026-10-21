---
instruction_id: allocate-an-exit-code-from-a-fixed-band
title: Allocate an exit code from a fixed band
summary: "A new exit code is taken from a band that is reserved for its kind of meaning, and the two universal codes stay unallocated; a code outside the bands is refused before it is ever published."
capability_tags:
  - define-output-format
pattern_tags:
  - safe-defaults
conditions_applies_when: A new exit code is being registered.
conditions_does_not_apply_when: The tool has no exit codes and none are being added.
artifact_contract_output_type: exit-code-band
artifact_contract_required_data:
  - the band the code comes from
  - the two codes that stay free
  - what happens to a code outside the bands
artifact_contract_verified_by: the code was allocated from a reserved band and the universal codes stayed free
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/exit-codes.md
status: active
revision: 1
---

# Allocate an exit code from a fixed band
- The registered codes above are not chosen freely — each falls inside one of a fixed set of allocatable bands (ADR-3889 §1). A code outside these bands can never be registered; validation rejects it before it reaches the tables above.
- `0` is the universal "succeeded" convention and `1` is the universal "failed, no further detail" convention across nearly every CLI ecosystem.
