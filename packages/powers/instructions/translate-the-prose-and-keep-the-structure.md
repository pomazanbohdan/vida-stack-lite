---
instruction_id: translate-the-prose-and-keep-the-structure
title: Translate the prose and keep the structure
summary: "An embedded template is a structural source, not literal output: its prose is rendered in the configured language while the headings' markers, the table columns, the ids, the commands and the file paths stay as they are."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A template or banner written in one language is rendered for a run in another language.
conditions_does_not_apply_when: The block is required to be emitted byte for byte.
artifact_contract_output_type: rendered-template
artifact_contract_required_data:
  - the translated prose
  - the structural markers that stayed
artifact_contract_verified_by: "the prose is translated and the headings' markers, columns, ids, commands and paths are unchanged"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/response-language-directive.md
status: active
revision: 1
---

# Translate the prose and keep the structure
Literal English report/banner templates embedded in a workflow are a structural SOURCE, not literal output to copy verbatim - render their prose translated into `{response_language}` while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged. Exception: blocks a workflow explicitly requires to be emitted byte-for-byte (e.g. pre-rendered checkpoints) are output exactly as rendered.
