---
instruction_id: keep-the-state-file-a-digest-not-an-archive
title: "Keep the state file a digest, not an archive"
summary: A state file stays a small digest of where the work stands; the history accumulates in the section that is designed to grow.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A state file that records the current position is being written.
conditions_does_not_apply_when: The file is the archive itself and is meant to carry the history.
artifact_contract_output_type: state-digest
artifact_contract_required_data:
  - the current position
  - the section that carries the growing history
artifact_contract_verified_by: the file holds the current position only and the history lives in the section designed to grow
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/state-md.md
status: active
revision: 1
---

# Keep the state file a digest, not an archive
- The file is intentionally small (target: under 100 lines). It is a digest of the project's state, not an archive.
- Progress *history* does not belong here. It accumulates in [`### Performance Metrics`](#performance-metrics) below, which is the section designed to grow.
