---
instruction_id: report-the-split-instead-of-forcing-one-rating
title: Report the split instead of forcing one rating
summary: "When the evidence differs between contexts, the split is the finding; one averaged rating hides it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - preserved-disagreement
conditions_applies_when: The same pattern holds in one context and not in another.
conditions_does_not_apply_when: The evidence agrees everywhere.
artifact_contract_output_type: split-report
artifact_contract_required_data:
  - the contexts that differ
  - what holds in each
artifact_contract_verified_by: the split is described and no single rating was forced across it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Report the split instead of forcing one rating
**Report context-dependent splits rather than forcing a single rating when contradictory signals exist across projects**
If the pattern varies by project: `cross_project_consistent: false`, describe the split in the summary
