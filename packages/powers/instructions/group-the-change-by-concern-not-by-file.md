---
instruction_id: group-the-change-by-concern-not-by-file
title: "Group the change by concern, not by file"
summary: "Each slice carries one concern, leads with the mechanism, then names the places."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A change is written up slice by slice for a human reviewer.
conditions_does_not_apply_when: The change is a single file with a single concern.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the concern of each slice
  - the mechanism of the slice
  - the places of the slice
artifact_contract_verified_by: "no slice is one file, and every slice leads with two or three sentences of mechanism"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 1
---

# Group the change by concern, not by file
One concern per block, not one file. Lead with the mechanism in two or three sentences, then the specific places with references.
For a simple change applied to a large number of files, group the files by how they were changed (one or several groups). Treat each group as a slice: one or two worked examples, plus a clickable list of the rest that got the same treatment.
