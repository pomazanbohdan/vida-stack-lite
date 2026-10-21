---
instruction_id: stamp-the-freshness-marker-outside-the-producer
title: Stamp the freshness marker outside the producer
summary: "The machine-readable freshness marker is written by a step the producing agent cannot skip, and only for the artefacts that were really regenerated."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A generated artefact carries a freshness marker that a later gate reads.
conditions_does_not_apply_when: The artefact has no freshness marker and none is needed.
artifact_contract_output_type: freshness-stamp
artifact_contract_required_data:
  - the machine-readable marker
  - the artefact it was written into
  - the artefacts that were not regenerated
artifact_contract_verified_by: no artefact claims a freshness it did not receive
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/map-codebase.md
status: active
revision: 1
---

# Stamp the freshness marker outside the producer
The human-readable markers the mapper writes (`**Analysis Date:**`, `<!-- refreshed: ... -->`) are restamped unconditionally on an Update run, so a mapper that decides its work is already done and rewrites only the dates still looks fresh to a human.
Leaving the machine-readable stamp to the same agent reproduces exactly the failure the stamp exists to detect.
A shell step cannot be skipped by a confident agent.
An Update run does not touch the documents the user did not select, so stamping those at HEAD would claim a freshness they do not have.
Stamp only what you regenerated.
