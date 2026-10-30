---
instruction_id: read-each-input-once-and-work-from-the-loaded-context
title: Read each input once and work from the loaded context
summary: A file already in context is not read again; every later check runs against what the first read produced.
capability_tags:
  - read-large-artifacts
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Several checks run over the same input document.
conditions_does_not_apply_when: The input changed between the checks.
artifact_contract_output_type: bounded-reading-record
artifact_contract_required_data:
  - the inputs that were loaded
  - the checks that ran against them
artifact_contract_verified_by: every input was read once and every check used that read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Read each input once and work from the loaded context
**No re-reads:** Once a file is loaded via `<required_reading>` or a manual Read call, it is in context — do not read it again. The UI-SPEC.md and other input files must be read exactly once; all 7 dimension checks then operate against that context.
**Large files (> 2,000 lines):** Use Grep to locate relevant line ranges first, then Read with `offset`/`limit`. Never reload the whole file for a second dimension.
