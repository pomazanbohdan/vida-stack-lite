---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-consume-the-planning-snapshot-md-4be36671-c01"
title: "gsd-core: docs/how-to/consume-the-planning-snapshot.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/consume-the-planning-snapshot.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/consume-the-planning-snapshot.md\"}"
atom_ids:
  - an-empty-value-under-a-complete-scope-is-a-real-answer
  - check-the-schema-version-before-you-read-any-other-field
  - label-the-human-annotation-as-an-annotation
  - withhold-the-number-when-the-base-is-incomplete
atom_count: 4
atoms: "[{\"atom_id\":\"an-empty-value-under-a-complete-scope-is-a-real-answer\",\"file_sha256\":\"e35fdebd3e91212452964a25be40ca4e60df0c709faf5b81d12ed026143f4bba\",\"content_sha256\":\"4fdb2eaade46fa331ea8f2ed03e42ebe111767c4f4c2851afaafda37364e482b\",\"file_bytes\":1446,\"body_bytes\":290},{\"atom_id\":\"check-the-schema-version-before-you-read-any-other-field\",\"file_sha256\":\"75d78dea97a6ea182ccf441b2f5890a7ff540676d68bc7442f25d482740a77e6\",\"content_sha256\":\"b2962e87234e3b631e18c056d1790deaa637783ede46a4b1c23c44909d34e6fd\",\"file_bytes\":1792,\"body_bytes\":491},{\"atom_id\":\"label-the-human-annotation-as-an-annotation\",\"file_sha256\":\"b5dcd084969694d5c49fb41048d158fe18157c767a99182d0c41554472bb7e16\",\"content_sha256\":\"37376d3db4227d687b2d972eab9f82b9f9a79f704c05611e6b63b8827b86aa53\",\"file_bytes\":1431,\"body_bytes\":288},{\"atom_id\":\"withhold-the-number-when-the-base-is-incomplete\",\"file_sha256\":\"05843a620b99431fa760cff29c086d1641540c15ac2aee990669f41cbf23d754\",\"content_sha256\":\"035eec33a2a9725c0bc0b099e8db84690e53abf619fe6e3cd542634beda0f255\",\"file_bytes\":1497,\"body_bytes\":371}]"
carrier_sha256: a451a98803dec366af782ae4bb0afbfa41f81a99cda530cba616eda72f4f798a
carrier_bytes: 6797
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-empty-value-under-a-complete-scope-is-a-real-answer -->
---
instruction_id: an-empty-value-under-a-complete-scope-is-a-real-answer
title: An empty value under a complete scope is a real answer
summary: "Zero under a scope that says the read succeeded is the answer; zero under a scope that says nobody looked is not, and the two are never rendered the same way."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A value is rendered together with the scope that says how it was obtained.
conditions_does_not_apply_when: The value is not scoped.
artifact_contract_output_type: scoped-value
artifact_contract_required_data:
  - the value
  - the scope it was obtained under
artifact_contract_verified_by: an empty value under a complete scope is rendered as the answer and never as a failure to look
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - research
---

# An empty value under a complete scope is a real answer
**`complete` with an empty value is a real answer.** A milestone with zero phases genuinely has zero phases. `unreadable` with an empty value means nobody looked. Rendering both as "0 phases" is the bug this field exists to prevent.
<!-- vpmodule:atom:end an-empty-value-under-a-complete-scope-is-a-real-answer -->
<!-- vpmodule:atom:begin check-the-schema-version-before-you-read-any-other-field -->
---
instruction_id: check-the-schema-version-before-you-read-any-other-field
title: Check the schema version before you read any other field
summary: The contract version is read first and an unknown version is a hard failure; a best-effort parse of an unknown shape is how an integration starts reporting wrong numbers.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A machine-readable document with a version field is about to be consumed.
conditions_does_not_apply_when: The document carries no version.
artifact_contract_output_type: version-check
artifact_contract_required_data:
  - the version found
  - the decision taken on it
artifact_contract_verified_by: the version was checked before any other field was read and an unknown version stopped the read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/consume-the-planning-snapshot.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/consume-the-state-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check the schema version before you read any other field
**Reject any version you were not written against.** Do this before you touch any other field
Best-effort-parsing an unknown shape is how an integration starts silently reporting wrong numbers after an upgrade. A hard failure is the kinder outcome.
`contract` is semver. Under `1.x` changes are additive only — new keys may appear, existing keys keep their meaning — so gate on the **major** version and tolerate unknown minors
<!-- vpmodule:atom:end check-the-schema-version-before-you-read-any-other-field -->
<!-- vpmodule:atom:begin label-the-human-annotation-as-an-annotation -->
---
instruction_id: label-the-human-annotation-as-an-annotation
title: Label the human annotation as an annotation
summary: A ticked box carries no machine authority; when it is shown it is labelled as an annotation and the status still comes from the recorded state.
capability_tags:
  - communicate-concisely
pattern_tags:
  - evidence-analysis
conditions_applies_when: A human-entered marker is rendered next to the recorded state.
conditions_does_not_apply_when: Every value shown comes from the recorded state.
artifact_contract_output_type: labelled-state
artifact_contract_required_data:
  - the annotation
  - the recorded state it is shown next to
artifact_contract_verified_by: the annotation is labelled as an annotation and the status is read from the recorded state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Label the human annotation as an annotation
`roadmap_acceptance` carries `authoritative: false`, and it means it. A ticked checkbox is a human annotation with no machine authority — completion comes from disk state. If you show the checkbox, label it as an annotation, not as status.
<!-- vpmodule:atom:end label-the-human-annotation-as-an-annotation -->
<!-- vpmodule:atom:begin withhold-the-number-when-the-base-is-incomplete -->
---
instruction_id: withhold-the-number-when-the-base-is-incomplete
title: Withhold the number when the base is incomplete
summary: A percentage computed from a partial set is a confidently wrong number; it is withheld rather than substituted or recomputed from partial counts.
capability_tags:
  - measure-performance
pattern_tags:
  - empty-result-policy
conditions_applies_when: A derived number is computed from a set whose scope is not complete.
conditions_does_not_apply_when: The set is complete.
artifact_contract_output_type: derived-metric
artifact_contract_required_data:
  - the scope of the base
  - the withheld marker
artifact_contract_verified_by: the number is withheld under an incomplete scope and was not substituted with zero or recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Withhold the number when the base is incomplete
**`percent` is `null` whenever `scope` is not `complete`.**
That is deliberate. A percentage computed from a partial phase set is a confidently wrong number, and a consumer cannot tell it apart from a real one. Do not substitute `0`, and do not compute your own from `completed / total` — those counts are partial too.
<!-- vpmodule:atom:end withhold-the-number-when-the-base-is-incomplete -->