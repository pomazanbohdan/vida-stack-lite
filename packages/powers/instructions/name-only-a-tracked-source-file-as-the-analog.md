---
instruction_id: name-only-a-tracked-source-file-as-the-analog
title: Name only a tracked source file as the analog
summary: The file to copy from is one the version control tracks; a generated mirror is replaced by the origin it was synced from.
capability_tags:
  - audit-codebase
pattern_tags:
  - source-hierarchy
conditions_applies_when: A file is named as the pattern to copy from.
conditions_does_not_apply_when: The candidate file is not in version control at all.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the analog path
  - its tracked origin
artifact_contract_verified_by: every named analog is a tracked file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name only a tracked source file as the analog
every analog path you name must be git-TRACKED source, never a gitignored install/runtime mirror
Before naming an analog whose file exists on disk, verify `git ls-files -- <path>` prints it (non-empty = tracked)
if the closest analog is a gitignored mirror, substitute its tracked origin
