---
instruction_id: strip-the-markers-at-emit-not-in-the-content
title: "Strip the markers at emit, not in the content"
summary: "The control markers are removed when the artifact is produced, and they are removed before any rewriting runs, so no rewrite ever sees the marker text."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - source-conversion
conditions_applies_when: An artifact is assembled from marked sections and then rewritten for a target.
conditions_does_not_apply_when: The artifact has no control markers.
artifact_contract_output_type: marker-stripping
artifact_contract_required_data:
  - the markers that are stripped
  - the order the stripping happens in
  - what the emitted artifact contains
artifact_contract_verified_by: the emitted artifact carries no markers and the rewriting never saw them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/workflow-fragments.md
status: active
revision: 1
---

# Strip the markers at emit, not in the content
- The marker lines themselves are never part of any fragment body, so the composed output — and therefore every installed runtime artifact — contains no `gsd:section` markers at all.
- Composition runs **before** the per-runtime converters (the `.claude/` → `.windsurf/`-style path and reference rewrites), so a marker's `id`/`when` attribute text is never exposed to a rewrite regex.
