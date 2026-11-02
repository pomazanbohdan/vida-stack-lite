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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Build a forensic log layer when the run needs observability
**If the spike needs runtime observability,** build a forensic log layer:
Event log array with ISO timestamps and category tags
Export mechanism (server: GET endpoint, CLI: JSON file, browser: Export button)
Log summary (event counts, duration, errors, metadata)
Analysis helpers if volume warrants it
