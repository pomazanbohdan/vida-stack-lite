---
instruction_id: keep-the-intel-file-within-its-output-budget
title: Keep the intel file within its output budget
summary: The most important files are listed and the rest is left out rather than the budget being blown.
capability_tags:
  - communicate-concisely
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A knowledge base file about a large codebase is written.
conditions_does_not_apply_when: The codebase is small enough to list exhaustively.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the listed files
artifact_contract_verified_by: the file stays inside the stated budget and the key files are the ones listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.compact.md
status: active
revision: 1
---

# Keep the intel file within its output budget
For large codebases, prioritize coverage of key files over exhaustive listing.
Include the most important 50-100 source files in file-roles.json rather than attempting to list every file.
DO NOT exceed output budget -- prioritize key files over exhaustive listing
