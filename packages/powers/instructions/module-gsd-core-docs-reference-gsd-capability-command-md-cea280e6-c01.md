---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-gsd-capability-command-md-cea280e6-c01"
title: "gsd-core: docs/reference/gsd-capability-command.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/reference/gsd-capability-command.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/gsd-capability-command.md\"}"
atom_ids:
  - keep-the-consent-record-outside-the-repository
  - remove-exactly-what-the-ledger-recorded
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-consent-record-outside-the-repository\",\"file_sha256\":\"7e5c4cc8e122991ecbe47e75ce6bea320227d19e1da84c51edef79155995a5e3\",\"content_sha256\":\"f0d582aaf9c7ca1e91c2d27fda147b1607811cb6e6c6bf3a62462c824b208006\",\"file_bytes\":1803,\"body_bytes\":575},{\"atom_id\":\"remove-exactly-what-the-ledger-recorded\",\"file_sha256\":\"b121fa718276adfd7b101f9da7e11948cc352edc8aef9e692a736b2989c8f90f\",\"content_sha256\":\"6cc61e1d0f7397f7e7618a5c0f1435ea782de0e3732f3c4069b13e5954d73a15\",\"file_bytes\":1567,\"body_bytes\":382}]"
carrier_sha256: 5ee07231d2b903e9e32ab549ffa1d496d87c7e629086593d50d071493f7d231e
carrier_bytes: 3655
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-consent-record-outside-the-repository -->
---
instruction_id: keep-the-consent-record-outside-the-repository
title: Keep the consent record outside the repository
summary: "The record of what was consented to lives outside any repository and is bound to the project root, the bundle integrity and the disclosure signature, so a copied project file activates nothing."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A consent record is written or read.
conditions_does_not_apply_when: The consent record is kept in the repository it governs.
artifact_contract_output_type: external-consent-store
artifact_contract_required_data:
  - where the consent record lives
  - what it is bound to
  - what a copied project file activates
artifact_contract_verified_by: the consent record lives outside the repository and a copied project file activates nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gsd-capability-command.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the consent record outside the repository
- The store lives at `${GSD_HOME||homedir()}/.gsd/consent.json` — **outside any repository** — and records, per `(realpath(projectRoot), capability id)`, the bundle integrity and disclosure signature you consented to **on this machine**.
- A project-scope overlay is inactive until such a record exists (so a forged or cloned in-repo project ledger activates nothing on its own)
- `remove` already revokes consent as part of an uninstall; `trust revoke` is the way to withdraw consent **without** uninstalling the bundle.
<!-- vpmodule:atom:end keep-the-consent-record-outside-the-repository -->
<!-- vpmodule:atom:begin remove-exactly-what-the-ledger-recorded -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/gsd-capability-command.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Remove exactly what the ledger recorded
- Reads the ledger entry for `<id>` and removes exactly: the owned files listed in `files`, and the fragments written into shared files listed in `sharedEdits`
- Shared files themselves are not deleted; only the capability's marker-isolated fragments are stripped. The ledger entry is removed atomically after all file operations complete.
<!-- vpmodule:atom:end remove-exactly-what-the-ledger-recorded -->