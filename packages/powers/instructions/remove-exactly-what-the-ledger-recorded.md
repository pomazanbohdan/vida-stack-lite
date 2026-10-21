---
instruction_id: remove-exactly-what-the-ledger-recorded
title: Remove exactly what the ledger recorded
summary: "An uninstall removes the owned files and the fragments it wrote into shared files, leaves the shared files themselves alone, and clears the ledger entry only after the file work is done."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A component that was installed is being removed.
conditions_does_not_apply_when: The component was never installed and nothing is recorded about it.
artifact_contract_output_type: exact-removal
artifact_contract_required_data:
  - the owned files
  - the shared fragments
  - the order the ledger entry is cleared in
artifact_contract_verified_by: only what the ledger recorded was removed and the shared files survived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gsd-capability-command.md
status: active
revision: 1
---

# Remove exactly what the ledger recorded
- Reads the ledger entry for `<id>` and removes exactly: the owned files listed in `files`, and the fragments written into shared files listed in `sharedEdits`
- Shared files themselves are not deleted; only the capability's marker-isolated fragments are stripped. The ledger entry is removed atomically after all file operations complete.
