---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-connectors-gcp-knowledge-catalog-md-7d094d68-c01"
title: "open-knowledge-format: connectors/gcp-knowledge-catalog.md module"
summary: "Carrier for 2 atomic instructions from open-knowledge-format:connectors/gcp-knowledge-catalog.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"connectors/gcp-knowledge-catalog.md\"}"
atom_ids:
  - separate-a-normalization-diff-from-a-translation-loss
  - treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue
atom_count: 2
atoms: "[{\"atom_id\":\"separate-a-normalization-diff-from-a-translation-loss\",\"file_sha256\":\"a9a2a57936497632a0cf18587d67721b6b1003e8b6af248fcfdcaf5ae83da855\",\"content_sha256\":\"3e5af1178d7445fa9d89f60b52939edf181ccb81277d77e466097845e47d6d45\",\"file_bytes\":1629,\"body_bytes\":427},{\"atom_id\":\"treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue\",\"file_sha256\":\"4b082c665795d2765da4471882166e85341e799f6e028e5aed005381a7aa6d0a\",\"content_sha256\":\"835081761da390ae912f7147f3d11f8b0156fbd812d7836d20f63faa980ae85b\",\"file_bytes\":1578,\"body_bytes\":252}]"
carrier_sha256: a29fca5dc460c65926c77225cf26edebe6a1c8c01ed88cde7893b92d4fcceae0
carrier_bytes: 3586
revision: 1
status: active
---
<!-- vpmodule:atom:begin separate-a-normalization-diff-from-a-translation-loss -->
---
instruction_id: separate-a-normalization-diff-from-a-translation-loss
title: Separate a normalization diff from a translation loss
summary: "A round trip through a catalogue rewrites the formatting of a document; that rewrite is a normalisation, and any other difference is a key the translation lost."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A corpus is pushed to a catalogue and pulled back to check the round trip.
conditions_does_not_apply_when: The round trip is not checked.
artifact_contract_output_type: round-trip-diff
artifact_contract_required_data:
  - the differences found
  - which of them are normalisation
  - which of them are loss
artifact_contract_verified_by: every difference is classified as normalisation or as a key the translation lost
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=connectors/gcp-knowledge-catalog.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Separate a normalization diff from a translation loss
The first pull rewrites every frontmatter block into the tool's YAML style — sequences indented, timestamps unquoted, mapping keys reordered, lines rewrapped at a different width. No values change.
Commit that normalization once and later pulls are byte-identical, which is what makes `--exit-code` worth running.
Any other diff is a key the translation doesn't carry.
<!-- vpmodule:atom:end separate-a-normalization-diff-from-a-translation-loss -->
<!-- vpmodule:atom:begin treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue -->
---
instruction_id: treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue
title: Treat the version-controlled copy as authoritative when you push to a catalogue
summary: "A catalogue has no merge story, so the version-controlled copy is the authority: push on merge and never pull a tracked corpus back."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
  - working-copy-authority-policy
conditions_applies_when: A corpus is pushed to a catalogue that cannot merge changes back.
conditions_does_not_apply_when: The catalogue can mirror the corpus and merge what comes back.
artifact_contract_output_type: sync-policy
artifact_contract_required_data:
  - the copy that is authoritative
  - the direction of the sync
artifact_contract_verified_by: the version-controlled copy is authoritative and the sync runs in one direction
compatibility_excludes:
  - the-local-record-is-the-working-copy-the-remote-is-pulled-back
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=connectors/gcp-knowledge-catalog.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat the version-controlled copy as authoritative when you push to a catalogue
**Renames orphan catalog state, deletes leave entries behind**, and there is no merge story.
Treat git as authoritative: push on merge, don't pull into a tracked bundle.
<!-- vpmodule:atom:end treat-the-version-controlled-copy-as-authoritative-when-you-push-to-a-catalogue -->