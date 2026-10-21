---
instruction_id: skip-the-question-you-have-already-answered
title: Skip the question you have already answered
summary: "Before new work starts, the earlier results are read: answered questions are skipped, failed approaches are not repeated, and the prior findings are carried forward."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: New work starts in a space that earlier work already touched.
conditions_does_not_apply_when: Nothing relevant has been done before.
artifact_contract_output_type: prior-work-reuse
artifact_contract_required_data:
  - the questions already answered
  - the findings carried forward
  - the deviations from the conventions
artifact_contract_verified_by: no already-answered question was asked again and the prior findings were carried forward
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 1
---

# Skip the question you have already answered
**Skip already-validated questions.** Note the prior spike number and move on.
**Build on prior findings.** Don't repeat failed approaches. Use their Research and Results sections.
**Reuse prior research.** Carry findings forward rather than re-researching.
**Follow established conventions.** Mention any deviation.
**Call out relevant prior art** when presenting the decomposition.
