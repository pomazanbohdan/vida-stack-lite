---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-features-reachable-lint-rules-and-non-destructive-quick-task-append-md-056ea6e1-c01"
title: "gsd-core: docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md\"}"
atom_ids:
  - do-not-re-derive-fields-a-partial-write-does-not-own
  - make-a-guard-reach-the-surface-it-was-registered-for
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-re-derive-fields-a-partial-write-does-not-own\",\"file_sha256\":\"8dade22dbcb95afacb8be51ae586876a691fada180096944f536167b25b563ea\",\"content_sha256\":\"b08e61aedf826a328dc6a95b134d421f768f72e1e6b974499cf4015e5a337835\",\"file_bytes\":1633,\"body_bytes\":339},{\"atom_id\":\"make-a-guard-reach-the-surface-it-was-registered-for\",\"file_sha256\":\"b8beee37b9a80ca23369b9263be7fa96b23b189998d89d15277e1dde64258c9f\",\"content_sha256\":\"2363c9b5ec2122b34f3eefb3ef8106b577eab8c646ac89b55e31bf463e79f3d7\",\"file_bytes\":2448,\"body_bytes\":1213}]"
carrier_sha256: f66bf576ec2b74b6024a0bbc50c829b0b16b6e37ac652866b3c0be2f5282cd68
carrier_bytes: 4404
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-re-derive-fields-a-partial-write-does-not-own -->
---
instruction_id: do-not-re-derive-fields-a-partial-write-does-not-own
title: Do not re-derive fields a partial write does not own
summary: A write that touches one part of a record does not re-derive the rest and replace the curated values.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - override-layering
conditions_applies_when: A writer changes one part of a record that also holds values someone curated by hand.
conditions_does_not_apply_when: The write owns the whole record.
artifact_contract_output_type: partial-write
artifact_contract_required_data:
  - the part of the record the write changes
  - the fields the write leaves alone
  - the curated value that stayed
artifact_contract_verified_by: the curated value survived the append
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body recounts a prior append and re-derivation failure but states no judgment rule, conditional obligation, ordered action, or set of checks from which a form can be supported."
---

# Do not re-derive fields a partial write does not own
A body-only append no longer re-derives progress.
Appending one row triggered a full re-derive of the disk-derived `progress.*` frontmatter and replaced curated values.
Reproduced: a project with two real phase directories and a curated `total_phases: 25` collapsed to `2` on append.
<!-- vpmodule:atom:end do-not-re-derive-fields-a-partial-write-does-not-own -->
<!-- vpmodule:atom:begin make-a-guard-reach-the-surface-it-was-registered-for -->
---
instruction_id: make-a-guard-reach-the-surface-it-was-registered-for
title: Make a guard reach the surface it was registered for
summary: "The gate and its registration agree in both directions; a hole is closed because it can open, not because nothing was found in it today."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A check is registered on a set of files and paths.
conditions_does_not_apply_when: The check covers every file it is meant to cover.
artifact_contract_output_type: guard-surface-coverage
artifact_contract_required_data:
  - the surface the guard is registered on
  - the part of the surface the guard skipped
  - the test that pins the two in both directions
artifact_contract_verified_by: the guard and the registration agree in both directions and a test pins it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make a guard reach the surface it was registered for
The rule short-circuited unless a file's path matched a flat `src/*.cts` pattern, so it **self-gated on its own filename**.
Both halves now move together, and a test pins that the gate and the registration agree in *both* directions.
The `src/` subdirectory hole was **latent** — zero violations existed there when it was fixed.
It is closed because "no violations today" is not a property that keeps holding, not because it was hiding anything.
The rule now also covers `tests/**` and `scripts/**`, which surfaced **80 hand-rolled markdown parses across 43 test files**.
Seventy are routed through the existing `markdown-sectionizer` and `markdown-table` seams; ten are suppressed with a stated reason
The 10 suppressions are suppressions, not fixes. Each names why the raw markdown text is the subject of that assertion.
Found by the widening: `tests/config-field-docs.test.cjs` asserted that `workflow.subagent_timeout`'s documented default is not `600` — but read the **Type** column instead of **Default**, so it compared `'number'` against `'600'` and could never fail.
The guard against regressing to the old seconds-based default had been inert.
<!-- vpmodule:atom:end make-a-guard-reach-the-surface-it-was-registered-for -->