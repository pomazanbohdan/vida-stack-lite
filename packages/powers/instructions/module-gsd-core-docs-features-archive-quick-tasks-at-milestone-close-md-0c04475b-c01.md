---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-features-archive-quick-tasks-at-milestone-close-md-0c04475b-c01"
title: "gsd-core: docs/features/archive-quick-tasks-at-milestone-close.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/features/archive-quick-tasks-at-milestone-close.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/features/archive-quick-tasks-at-milestone-close.md\"}"
atom_ids:
  - do-not-infer-provenance-from-a-proxy-before-a-one-way-move
  - never-auto-apply-a-destructive-or-unrecognised-change
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-infer-provenance-from-a-proxy-before-a-one-way-move\",\"file_sha256\":\"1e53b575d03fa09223b966946f671d1668797e44ee50ab9f64f83d372d887034\",\"content_sha256\":\"a5ac8af7b2810cd0cfb3587194cdb001dcf27ea05fb3da03479152bcc3b2b245\",\"file_bytes\":1487,\"body_bytes\":288},{\"atom_id\":\"never-auto-apply-a-destructive-or-unrecognised-change\",\"file_sha256\":\"d5a842a69a4c86301b73725ea736a0b75b800cb8b877a1e938c1e3092e3b94b3\",\"content_sha256\":\"0250edd87977a89442dd6e2a19b4dc83f6fca401d873cfb409d6b32fb25ef45d\",\"file_bytes\":1683,\"body_bytes\":392}]"
carrier_sha256: a6debd00e85104f4d70cd5b74d0adfdd71c11e8b2e91b72c1147631c3d49b364
carrier_bytes: 3507
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-infer-provenance-from-a-proxy-before-a-one-way-move -->
---
instruction_id: do-not-infer-provenance-from-a-proxy-before-a-one-way-move
title: Do not infer provenance from a proxy before a one-way move
summary: "A date is a proxy, not a fact; a wrong inference applied to a one-way move is silently irreversible."
capability_tags:
  - assess-change-impact
pattern_tags:
  - risk-first-ordering
conditions_applies_when: Records are about to be moved or grouped and their owner is not recorded.
conditions_does_not_apply_when: The owner of every record is recorded on disk.
artifact_contract_output_type: provenance-decision
artifact_contract_required_data:
  - the proxy that was refused
  - the grouping that was chosen instead
  - what the confirmation says about the grouping
artifact_contract_verified_by: no provenance was inferred from a proxy and the grouping is stated in the confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/archive-quick-tasks-at-milestone-close.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not infer provenance from a proxy before a one-way move
Splitting tasks per milestone was considered and rejected
inferring provenance from dates (creation time vs. a milestone's shipped date) is a proxy, not a fact, and a wrong inference on a one-way `mv` is silently irreversible.
<!-- vpmodule:atom:end do-not-infer-provenance-from-a-proxy-before-a-one-way-move -->
<!-- vpmodule:atom:begin never-auto-apply-a-destructive-or-unrecognised-change -->
---
instruction_id: never-auto-apply-a-destructive-or-unrecognised-change
title: Never auto-apply a destructive or unrecognised change
summary: "A repair that carries destructive risk and a record whose shape is not recognised are reported, never applied."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "A tool may repair, reset or clean up a record it did not create."
conditions_does_not_apply_when: The change is recoverable and its shape is recognised.
artifact_contract_output_type: repair-report
artifact_contract_required_data:
  - the issue that was found
  - the risk that made it destructive
  - the reason it was not applied
artifact_contract_verified_by: the destructive or unrecognised issue is reported and nothing was applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/health-validation.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/archive-quick-tasks-at-milestone-close.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never auto-apply a destructive or unrecognised change
`--repair` flag MUST auto-fix recoverable issues except DESTRUCTIVE-risk ones, which it MUST report but never auto-apply
System MUST detect orphaned plans without summaries
System MUST check phase numbering and roadmap sync
is left untouched with a warning rather than reset, since clearing it would risk destroying rows under a schema
<!-- vpmodule:atom:end never-auto-apply-a-destructive-or-unrecognised-change -->