---
instruction_id: read-the-measured-evidence-keys-precisely
title: Read the measured evidence keys precisely
summary: "The measured keys are read as they are: the file totals count the non-merge commits, the merge totals restate the churn, and the unmeasured churn is not zero."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
  - evidence-analysis
conditions_applies_when: The measured output of a range is read.
conditions_does_not_apply_when: The evidence was gathered without a measurement.
artifact_contract_output_type: measured-evidence
artifact_contract_required_data:
  - what each key counts
  - the gap between the measured and the unmeasured
artifact_contract_verified_by: no key is summed into another and the unmeasured churn is reported as unmeasured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/evidence-gathering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read the measured evidence keys precisely
Read the output keys precisely: each commit carries `is_merge` and `stories` — every id its subject names, so a commit spanning two stories counts for both.
`files` sums non-merge commits only.
`merge_files` is each measured merge's diff against its first parent, so it *restates* the churn that merge brought in plus whatever the conflict resolution added — never add it into `files`, and never read it as merge-introduced work on its own.
`merges_measured` counts the merges on the range head's first-parent spine; `merge_count` counts every merge in the range, so a gap between the two means merges went unmeasured.
`binary_revisions` is unmeasured churn, not zero churn.
