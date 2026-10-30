---
instruction_id: preserve-each-run-s-evidence-in-its-own-directory
title: "Preserve each run's evidence in its own directory"
summary: "The per-lane evidence is copied out of the working directory before that directory is removed, into a directory of its own so a later run cannot overwrite it; a leftover working directory is cheaper than destroyed evidence."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - evidence-preservation
conditions_applies_when: The evidence of a run lives in a temporary directory that is about to be removed.
conditions_does_not_apply_when: The run produced no evidence at all.
artifact_contract_output_type: preserved-evidence
artifact_contract_required_data:
  - the evidence that was copied
  - the directory it was copied into
artifact_contract_verified_by: the evidence is in its own directory and the working directory was removed only after the copy
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Preserve each run's evidence in its own directory
preserve per-lane evidence before destroying it
copy it beside the phase's artifacts BEFORE cleanup
ONE SUBDIRECTORY PER RUN
silently overwrote the first run's evidence for any lane that ran both times
a leftover temp directory is far cheaper than destroyed evidence
