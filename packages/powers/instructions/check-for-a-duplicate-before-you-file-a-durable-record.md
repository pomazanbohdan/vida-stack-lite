---
instruction_id: check-for-a-duplicate-before-you-file-a-durable-record
title: Check for a duplicate before you file a durable record
summary: "A record that is written into a store is checked against what the store already holds, so a re-run files the same content instead of a second copy."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A record is about to be written into a store that outlives the run.
conditions_does_not_apply_when: The store is empty and the record is written once.
artifact_contract_output_type: durable-record
artifact_contract_required_data:
  - the duplicate check
  - the record to file
  - the provenance that travels with it
artifact_contract_verified_by: the record was filed once and a re-run produces no second copy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/mempalace/fragments/capture-problems.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check for a duplicate before you file a durable record
- **Dedupe first.** Call `mempalace_check_duplicate` (interactive) before filing so re-runs don't create duplicate drawers.
- Captures are idempotent: deterministic drawer IDs + `check_duplicate` mean re-running the wave re-files the same content without duplication. On any error, skip and let the wave complete normally.
- Include provenance (`source_file`, phase id).
