---
instruction_id: build-a-forensic-log-layer-when-the-run-needs-observability
title: Build a forensic log layer when the run needs observability
summary: "When an experiment needs to be observed while it runs, it gets a log layer with timestamps, categories, an export path and a summary."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: An experiment has to be watched while it runs to explain what happened.
conditions_does_not_apply_when: The behaviour is fully visible without any instrumentation.
artifact_contract_output_type: forensic-log
artifact_contract_required_data:
  - the event log
  - the export mechanism
  - the summary
artifact_contract_verified_by: the run can be reconstructed afterwards from the exported log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 1
---

# Build a forensic log layer when the run needs observability
**If the spike needs runtime observability,** build a forensic log layer:
Event log array with ISO timestamps and category tags
Export mechanism (server: GET endpoint, CLI: JSON file, browser: Export button)
Log summary (event counts, duration, errors, metadata)
Analysis helpers if volume warrants it
