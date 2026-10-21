---
instruction_id: split-an-ownership-change-from-a-contract-change
title: Split an ownership change from a contract change
summary: The user-visible contract is preserved across a takeover; a change to it is a separate version bump afterwards.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Who maintains something changes while its contract stays in place.
conditions_does_not_apply_when: The contract itself is being redesigned.
artifact_contract_output_type: ownership-change
artifact_contract_required_data:
  - the contract fields that are preserved
  - the change request that carries only the ownership
artifact_contract_verified_by: the ownership change carries no contract change and the contract fields are byte-identical
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/take-over-a-capability-or-eos.md
status: active
revision: 1
---

# Split an ownership change from a contract change
These fields are the user-visible contract. A takeover **preserves** them. If you intend to change them, do that afterward as a normal version bump under your own maintainership — never inside the ownership-change PR.
Change `interactions` in the same PR as the ownership change. Split them.
