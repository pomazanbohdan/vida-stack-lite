---
instruction_id: ground-the-length-estimate-in-word-counts
title: Ground the length estimate in word counts
summary: "Every word-impact estimate and the reduction summary come from measured counts; when the count cannot be measured, the numbers are marked as estimates."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An editorial pass states how much a cut would save.
conditions_does_not_apply_when: The pass states no word impact at all.
artifact_contract_output_type: word-impact
artifact_contract_required_data:
  - the measured counts
  - the estimated reduction
  - whether the numbers are measured or estimated
artifact_contract_verified_by: "every stated word impact traces to a measured count, or is marked as an estimate"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 1
---

# Ground the length estimate in word counts
When the content is a file, get exact word counts — document total and per heading section —
Ground every word-impact estimate and the reduction summary in those numbers.
If the content was pasted or the script cannot run, estimate and mark the numbers as estimates.
