---
instruction_id: compose-through-one-builder-so-the-views-cannot-diverge
title: Compose through one builder so the views cannot diverge
summary: "The merged set and the shipped set are materialised by the same builder, so an accepted extension is indistinguishable from a shipped one in every derived view."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "Two sources are merged into one registry, and every derived view is built from it."
conditions_does_not_apply_when: Only one source exists.
artifact_contract_output_type: canonical-builder
artifact_contract_required_data:
  - the single builder
  - the two inputs it materialises
  - the views that are derived from it
artifact_contract_verified_by: both sources went through the same builder and the derived views cannot diverge
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Compose through one builder so the views cannot diverge
- By forcing both through the single canonical builder, GSD guarantees that an accepted overlay is indistinguishable from a first-party capability in every derived view — which is exactly the artifact-parity promise the platform makes.
