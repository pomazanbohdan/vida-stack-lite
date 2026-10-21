---
instruction_id: keep-everything-inside-the-marker-the-parser-reads
title: Keep everything inside the marker the parser reads
summary: The machine-readable block carries the whole payload; commentary outside it is not read and only breaks the extraction.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A structured result is parsed programmatically by its caller.
conditions_does_not_apply_when: The result is read by a person and prose is expected around it.
artifact_contract_output_type: structured-result
artifact_contract_required_data:
  - the payload inside the marker
artifact_contract_verified_by: nothing but the payload sits inside the marker and no commentary sits outside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.compact.md
status: active
revision: 1
---

# Keep everything inside the marker the parser reads
Wrap the JSON in `<analysis>` tags for reliable extraction by the orchestrator.
Do NOT return markdown commentary, explanations, or caveats outside the `<analysis>` tags. The orchestrator parses the tags programmatically.
