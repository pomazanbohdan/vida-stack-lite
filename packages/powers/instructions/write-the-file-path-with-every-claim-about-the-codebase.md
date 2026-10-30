---
instruction_id: write-the-file-path-with-every-claim-about-the-codebase
title: Write the file path with every claim about the codebase
summary: "Every statement about the code carries the path it came from and shows how the code does it, not only that it exists."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A map of an existing codebase is written.
conditions_does_not_apply_when: The document describes something that does not live in the repository.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the file path
  - the pattern shown
artifact_contract_verified_by: every claim names a file path and the pattern is shown with an example
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the file path with every claim about the codebase
Always include file paths: Vague descriptions like "UserService handles users" are not actionable. Always include actual file paths formatted with backticks: `src/services/user.ts`.
Patterns matter more than lists - Show HOW things are done (code examples) not just WHAT exists
"Use X pattern" is more useful than "X pattern is used."
