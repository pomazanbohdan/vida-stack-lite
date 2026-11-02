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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep everything inside the marker the parser reads
Wrap the JSON in `<analysis>` tags for reliable extraction by the orchestrator.
Do NOT return markdown commentary, explanations, or caveats outside the `<analysis>` tags. The orchestrator parses the tags programmatically.
