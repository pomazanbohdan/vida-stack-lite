---
instruction_id: make-an-update-atomic-and-recoverable
title: Make an update atomic and recoverable
summary: "The new version is fetched and validated before it is swapped in, so a stop in the middle leaves a consistent install."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: An installed component is updated.
conditions_does_not_apply_when: The update is a local edit with nothing to fetch.
artifact_contract_output_type: atomic-update
artifact_contract_required_data:
  - the commit point
  - the state the install is left in
artifact_contract_verified_by: the swap happened only after the validation and a stop leaves a consistent install
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/version-a-capability.md
status: active
revision: 1
---

# Make an update atomic and recoverable
Updates are **atomic**: the installer fully fetches and validates the new version before swapping it in. The ledger write is the commit point.
the next command run will detect the orphaned state via a reconciliation sweep and restore a consistent install
