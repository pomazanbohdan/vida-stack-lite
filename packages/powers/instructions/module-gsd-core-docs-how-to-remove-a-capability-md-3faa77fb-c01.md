---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-remove-a-capability-md-3faa77fb-c01"
title: "gsd-core: docs/how-to/remove-a-capability.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/remove-a-capability.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/remove-a-capability.md\"}"
atom_ids:
  - remove-only-the-entries-that-carry-your-marker
  - state-that-a-destructive-flag-deletes-without-confirmation
atom_count: 2
atoms: "[{\"atom_id\":\"remove-only-the-entries-that-carry-your-marker\",\"file_sha256\":\"2831ae6ed002775ed005d8e6d069e26538831becef3801ac9c370bc91149e0b9\",\"content_sha256\":\"d18b7bfb87f52e0ce502cb4485acca24af45b94f23026e560c89e74049fb3474\",\"file_bytes\":1748,\"body_bytes\":604},{\"atom_id\":\"state-that-a-destructive-flag-deletes-without-confirmation\",\"file_sha256\":\"8c0a41b47a8f47c77b75b9c8371054929134baec0e723d3a8cb5bd0950a3bb5c\",\"content_sha256\":\"0e72d6009eefd9fc831eadc41ea96cc58cd4c266f062d98c5a8990ae0848d9d4\",\"file_bytes\":1362,\"body_bytes\":235}]"
carrier_sha256: f00fc194688815eb76e78da004f7fc27108f22488ebe84bbf2b174aa67693e0b
carrier_bytes: 3433
revision: 1
status: active
---
<!-- vpmodule:atom:begin remove-only-the-entries-that-carry-your-marker -->
---
instruction_id: remove-only-the-entries-that-carry-your-marker
title: Remove only the entries that carry your marker
summary: A removal excises the entries the component stamped as its own; every other entry and every hand-made edit is preserved.
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - ownership-scoped-removal
conditions_applies_when: A component is removed and it has written into shared files.
conditions_does_not_apply_when: The component wrote no shared entries.
artifact_contract_output_type: scoped-removal
artifact_contract_required_data:
  - the stamped entries that are removed
  - the entries that are preserved
artifact_contract_verified_by: only the entries carrying the owner marker were removed and the rest of the file is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/remove-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Remove only the entries that carry your marker
Each capability-added entry is stamped at install with a marker naming the owning capability, and removal strips **only** entries carrying that marker.
No other capability's entries — and nothing you added by hand — is touched: if you hand-edited `settings.json` between install and remove (added your own hook, your own MCP server, or any other field), those edits are preserved exactly.
**Shared files themselves.** Files such as `settings.json` and `hooks.json` are edited in place, not deleted. Only the capability's specific entries are excised.
<!-- vpmodule:atom:end remove-only-the-entries-that-carry-your-marker -->
<!-- vpmodule:atom:begin state-that-a-destructive-flag-deletes-without-confirmation -->
---
instruction_id: state-that-a-destructive-flag-deletes-without-confirmation
title: State that a destructive flag deletes without confirmation
summary: "The removal prompts for nothing and a data flag deletes straight away, so the caller has to be sure before passing it."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - control-tiering
conditions_applies_when: A removal with a data flag is about to be run.
conditions_does_not_apply_when: The removal prompts and waits for a confirmation.
artifact_contract_output_type: destructive-action-disclosure
artifact_contract_required_data:
  - what the flag deletes
  - whether a confirmation is asked for
artifact_contract_verified_by: the disclosure states that the deletion happens without a confirmation step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/remove-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# State that a destructive flag deletes without confirmation
Removal is permanent within the current install.
`--purge-data` likewise deletes the capability's data directly, with no confirmation step — so be sure before you pass it.
<!-- vpmodule:atom:end state-that-a-destructive-flag-deletes-without-confirmation -->