---
instruction_id: trust-the-authoritative-record-not-the-secondary-note
title: "Trust the authoritative record, not the secondary note"
summary: The project record owns the facts; a secondary configuration file that mentions them may be stale and is never used as the source.
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: "A report needs the name, the milestone, the current phase or the next step."
conditions_does_not_apply_when: The authoritative record was already read.
artifact_contract_output_type: context-authority
artifact_contract_required_data:
  - the authoritative record
  - the secondary source that was ignored
artifact_contract_verified_by: every reported field came from the record that owns it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Trust the authoritative record, not the secondary note
One source owns the facts.
for project name, milestone, current phase, and next-step routing.
blocks are a secondary config aid that may be significantly stale — do NOT use the
project description as a source for any progress report field.
