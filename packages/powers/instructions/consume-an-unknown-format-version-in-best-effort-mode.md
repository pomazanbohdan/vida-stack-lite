---
instruction_id: consume-an-unknown-format-version-in-best-effort-mode
title: Consume an unknown format version in best-effort mode
summary: A corpus declares the version it targets; a consumer that does not understand that version reads the corpus as well as it can instead of refusing it.
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer meets a corpus whose declared version it does not know.
conditions_does_not_apply_when: The consumer understands the declared version.
artifact_contract_output_type: best-effort-read
artifact_contract_required_data:
  - the declared version
  - what the consumer could read
artifact_contract_verified_by: the corpus was read as far as the consumer could and was not refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Consume an unknown format version in best-effort mode
Bundles MAY declare the version they target with `okf_version: "0.2"` in a bundle-root `index.md` frontmatter block (the only place frontmatter is permitted in an `index.md`).
Consumers that do not understand the declared version SHOULD attempt best-effort consumption rather than refusing the bundle.
