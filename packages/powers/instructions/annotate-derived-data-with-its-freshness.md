---
instruction_id: annotate-derived-data-with-its-freshness
title: Annotate derived data with its freshness
summary: "Derived context that is out of date carries the annotation with it wherever it is used, so the reader knows the relationships in it are approximate."
capability_tags:
  - curate-context
pattern_tags:
  - evidence-analysis
conditions_applies_when: A derived artifact is loaded and its freshness is known.
conditions_does_not_apply_when: The derived artifact was just rebuilt.
artifact_contract_output_type: freshness-annotation
artifact_contract_required_data:
  - the age of the derived artifact
  - the annotation that travels with it
artifact_contract_verified_by: the annotation is present wherever the derived data is used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-load-graph-context.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-graphify-auto-update.md
status: active
revision: 1
---

# Annotate derived data with its freshness
If the status response has `stale: true`, note for later: "Graph is {age_hours}h old -- treat semantic relationships as approximate." Include this annotation inline with any graph context injected below.
If nothing comes back, continue without graph context.
