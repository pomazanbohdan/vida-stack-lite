---
instruction_id: write-machine-parseable-intel-with-a-file-path-on-every-claim
title: Write machine-parseable intel with a file path on every claim
summary: "The knowledge base is structured, every claim points at the code it came from, and nothing is inferred from names."
capability_tags:
  - curate-context
pattern_tags:
  - evidence-analysis
conditions_applies_when: A queryable knowledge base about a codebase is written.
conditions_does_not_apply_when: The output is prose for a reader rather than a lookup for a tool.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the entries
  - the file path of each entry
artifact_contract_verified_by: every entry names a real file path and is parseable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write machine-parseable intel with a file path on every claim
Write machine-parseable, evidence-based intelligence. Every claim references actual file paths. Prefer structured JSON over prose.
Always include file paths. Every claim must reference the actual code location.
Evidence-based. Read the actual files. Do not guess from file names or directory structures.
