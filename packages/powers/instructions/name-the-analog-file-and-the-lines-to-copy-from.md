---
instruction_id: name-the-analog-file-and-the-lines-to-copy-from
title: Name the analog file and the lines to copy from
summary: A new file is pointed at the existing file it should follow and at the exact lines the pattern lives on.
capability_tags:
  - design-structure
pattern_tags:
  - project-conventions-first
conditions_applies_when: A new file has to follow an existing pattern.
conditions_does_not_apply_when: The codebase has no analogous file.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the analog file
  - the lines
  - the excerpt
artifact_contract_verified_by: "every assignment names a file, a line range and an excerpt"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Name the analog file and the lines to copy from
Be concrete, not abstract. "Copy auth pattern from `src/controllers/users.ts` lines 12-25" not "follow the auth pattern."
Concrete, not abstract: Excerpts include file paths and line numbers
Extract as concrete code excerpts with file path and line numbers.
