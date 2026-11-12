---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-sync-skills-md-f33a7f7f-c01"
title: "gsd-core: gsd-core/workflows/sync-skills.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/sync-skills.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/sync-skills.md\"}"
atom_ids:
  - bound-a-copy-to-the-targets-that-can-receive-it
  - never-continue-with-an-empty-target-path
  - preview-a-mutating-operation-before-you-perform-it
atom_count: 3
atoms: "[{\"atom_id\":\"bound-a-copy-to-the-targets-that-can-receive-it\",\"file_sha256\":\"991820b239e4ff96b2d3720da2622d1e6017560f89b50200c3cada0d8f323a90\",\"content_sha256\":\"c91fc5ec8468ca32387edf24e5d00d06149a8606b5eb9b43a9a39ec508d1e52e\",\"file_bytes\":1817,\"body_bytes\":686},{\"atom_id\":\"never-continue-with-an-empty-target-path\",\"file_sha256\":\"3c396fdbec92e38a4d95213b263601551a4bff4fa00955536def36b0dbb84335\",\"content_sha256\":\"f89ea384ac62cca621ab0575ca04b5a053c63fa2f0a7a3968e1d0f5d4b15bb97\",\"file_bytes\":1253,\"body_bytes\":187},{\"atom_id\":\"preview-a-mutating-operation-before-you-perform-it\",\"file_sha256\":\"c05262c4e19009a8559c83d1d91fa2625839592e1f657cfd085f35bf1f37e64f\",\"content_sha256\":\"13270e7e96b0c77e283b3dd9c20650d5176c688b10a3f464291dd314ca7c002a\",\"file_bytes\":1714,\"body_bytes\":586}]"
carrier_sha256: 21ae0d44b235c6867ab09c404bbb49027c42bcdc3d4d0e66d50c32c10d6715a7
carrier_bytes: 5231
revision: 1
status: active
---
<!-- vpmodule:atom:begin bound-a-copy-to-the-targets-that-can-receive-it -->
---
instruction_id: bound-a-copy-to-the-targets-that-can-receive-it
title: Bound a copy to the targets that can receive it
summary: "A copy is refused when the target cannot receive the source verbatim, and even then it touches only the entries it owns."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: Files are copied from one place to another and the two places are not interchangeable.
conditions_does_not_apply_when: The source and the target are known to be interchangeable.
artifact_contract_output_type: copy-boundary
artifact_contract_required_data:
  - the source
  - the target
  - the refusal and the route that replaces it
artifact_contract_verified_by: the copy was refused or it touched only the entries it owns
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sync-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound a copy to the targets that can receive it
Skill content and directory layout are runtime-specific.
A verbatim copy from one runtime's skills root therefore produces content the installer would never have written for the destination, and can damage a runtime the user never named.
Refuse cross-runtime and point the user at the installer — the only path that produces correctly converted skills.
**No cross-runtime content transformation.** Sync copies files verbatim. It does not apply runtime-specific content transformations (those happen at install time).
Only the owned entries are created, updated, or removed, and every other entry in the destination is left untouched.
<!-- vpmodule:atom:end bound-a-copy-to-the-targets-that-can-receive-it -->
<!-- vpmodule:atom:begin never-continue-with-an-empty-target-path -->
---
instruction_id: never-continue-with-an-empty-target-path
title: Never continue with an empty target path
summary: A path that did not resolve stops the operation; continuing with it turns a scoped change into a change at the root.
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: An operation writes into a path that it resolved itself.
conditions_does_not_apply_when: The path is fixed and known to be present.
artifact_contract_output_type: unresolved-path-report
artifact_contract_required_data:
  - the unresolved path
  - the damage the empty value would cause
artifact_contract_verified_by: the operation stopped before it touched anything
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sync-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never continue with an empty target path
Never proceed
with an empty or unresolved root — an empty `$DEST_ROOT` turns `rm -rf "$DEST_ROOT/$SKILL"` into `rm -rf "/$SKILL"`.
Then exit.
<!-- vpmodule:atom:end never-continue-with-an-empty-target-path -->
<!-- vpmodule:atom:begin preview-a-mutating-operation-before-you-perform-it -->
---
instruction_id: preview-a-mutating-operation-before-you-perform-it
title: Preview a mutating operation before you perform it
summary: "A mutating operation previews by default, writes only when it is told to, always prints what it would do, and replaces each unit as a whole."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: An operation changes files outside the current directory.
conditions_does_not_apply_when: The operation is read-only.
artifact_contract_output_type: mutation-preview
artifact_contract_required_data:
  - the preview
  - the list of changes
  - the flag that applies them
artifact_contract_verified_by: the preview was printed before anything was written and a repeated run reports no change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sync-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Preview a mutating operation before you perform it
If neither `--dry-run` nor `--apply` is specified, dry-run is the default.
**Dry-run is the default.** `--apply` must be passed explicitly to write anything.
Always print the report, regardless of `--apply` or `--dry-run`:
**Atomicity:** Each skill directory is replaced as a unit (remove then copy). Partial updates of individual files within a skill are not performed — the whole directory is replaced.
**Idempotency:** Running `--apply` a second time with no intervening changes must report zero changes (all entries are SKIP).
<!-- vpmodule:atom:end preview-a-mutating-operation-before-you-perform-it -->