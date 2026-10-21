---
instruction_id: note-a-secret-file-by-its-existence-and-never-quote-it
title: Note a secret file by its existence and never quote it
summary: "A credential file is recorded as present; its contents never appear in the output, not even in part."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: "A credential, key or environment file is found while exploring."
conditions_does_not_apply_when: The file is an example file that carries placeholder values only.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the existence of the file
artifact_contract_verified_by: no value from a credential file appears in the output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 1
---

# Note a secret file by its existence and never quote it
NEVER read or quote contents from these files (even if they exist):
Note their EXISTENCE only: ".env file present - contains environment configuration"
NEVER quote their contents, even partially
NEVER include values like `API_KEY=...` or `sk-...` in any output
