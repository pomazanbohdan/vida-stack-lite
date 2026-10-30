---
instruction_id: keep-the-engine-input-in-the-engine-language-and-the-document-in-the-user-language
title: "Keep the engine input in the engine language and the document in the user's language"
summary: "A machine classifier that matches on English cues gets an English copy of every entry as its input, while the document itself keeps the user's own language and its identifiers are never translated."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document is written in one language and is fed to a machine classifier that matches on another one.
conditions_does_not_apply_when: The document and the classifier use the same language.
artifact_contract_output_type: machine-input
artifact_contract_required_data:
  - the original text
  - the classifier-facing translation
  - the unchanged identifiers
artifact_contract_verified_by: the document keeps its original language and only the machine input is translated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Keep the engine input in the engine language and the document in the user's language
add an optional `text_en` key to each `$REQS_JSON` entry: a faithful **English** translation of that requirement's `text`.
`text_en` is **engine input, never user-facing output**
`text` itself is NOT translated: write it as the requirement's own text, exactly as it appears in the SPEC.
The SPEC keeps the original language — only `text_en` is translated, and requirement `id`s are never translated or renumbered
Populate `text_en` for **every** requirement, not only the ones that look edge-relevant
