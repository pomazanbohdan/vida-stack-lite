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
