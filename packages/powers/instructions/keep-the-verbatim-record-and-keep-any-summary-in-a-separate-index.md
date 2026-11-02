---
instruction_id: keep-the-verbatim-record-and-keep-any-summary-in-a-separate-index
title: Keep the verbatim record and keep any summary in a separate index
summary: The record that is filed holds the artefact text as it is; a lossy summary is a separate and optional index and never replaces the record.
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - single-source-of-truth
conditions_applies_when: An artefact is filed into a store that also builds a derived index from it.
conditions_does_not_apply_when: No derived index is built from the artefact.
artifact_contract_output_type: filed-record
artifact_contract_required_data:
  - the artefact text as filed
  - the provenance of the filed text
artifact_contract_verified_by: "the filed text is the artefact itself and the summary, if there is one, is a separate artefact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=commands/gsd/mempalace-capture.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=skills/gsd-mempalace-capture/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the verbatim record and keep any summary in a separate index
DO NOT write lossy summaries -- store the verbatim artifact text (AAAK compression is a separate, optional index).
File the exact artifact text into `room: <room>` of `wing: <wing>` with provenance (`source_file`, phase id).
