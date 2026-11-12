---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-version-a-capability-md-cbe9c9f4-c01"
title: "gsd-core: docs/how-to/version-a-capability.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/version-a-capability.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/version-a-capability.md\"}"
atom_ids:
  - make-an-update-atomic-and-recoverable
  - raise-the-compatibility-floor-only-when-you-need-it
atom_count: 2
atoms: "[{\"atom_id\":\"make-an-update-atomic-and-recoverable\",\"file_sha256\":\"51752b82349488670fd292e2a7754225935d948513bc5751ae45f15265ac2f10\",\"content_sha256\":\"a8f4a19b7cfbba440b1d9575c5d5db9e4956f5c2389656366e7ad8f56c062589\",\"file_bytes\":1350,\"body_bytes\":295},{\"atom_id\":\"raise-the-compatibility-floor-only-when-you-need-it\",\"file_sha256\":\"97ad4d902413ccfc4038601ac8a6c4a4c887f067ef02b28b11b7161d26915969\",\"content_sha256\":\"dab414dade122899c8cab21c8e50a2091a3d53b8b7fdd4cc41031152ffbb8e0c\",\"file_bytes\":1617,\"body_bytes\":476}]"
carrier_sha256: 41daa0014b27389d95082a4c20da34207339b4c98f5b3c2e8979b04a6fda1101
carrier_bytes: 3258
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-an-update-atomic-and-recoverable -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/version-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Make an update atomic and recoverable
Updates are **atomic**: the installer fully fetches and validates the new version before swapping it in. The ledger write is the commit point.
the next command run will detect the orphaned state via a reconciliation sweep and restore a consistent install
<!-- vpmodule:atom:end make-an-update-atomic-and-recoverable -->
<!-- vpmodule:atom:begin raise-the-compatibility-floor-only-when-you-need-it -->
---
instruction_id: raise-the-compatibility-floor-only-when-you-need-it
title: Raise the compatibility floor only when you need it
summary: "The supported range is raised when the new behaviour is genuinely required, and the downgrade table is updated in the same change."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - migration-strategy
conditions_applies_when: The minimum supported host version is being changed.
conditions_does_not_apply_when: The change does not need a newer host version.
artifact_contract_output_type: compatibility-floor-change
artifact_contract_required_data:
  - the new floor
  - the downgrade entry that was added
artifact_contract_verified_by: the floor was raised only where the new behaviour is required and the downgrade entry was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/version-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Raise the compatibility floor only when you need it
Do not raise it pre-emptively; only raise it when the capability genuinely requires the newer behaviour.
Add a new entry **only when you change `engines.gsd`**
A `compatVersions` entry is not meaningful for a capability distributed as a bare tarball URL (a tarball exposes a single version and cannot be auto-selected from a table); it is only actionable for sources that enumerate versions: git tags, a registry, or npm.
<!-- vpmodule:atom:end raise-the-compatibility-floor-only-when-you-need-it -->