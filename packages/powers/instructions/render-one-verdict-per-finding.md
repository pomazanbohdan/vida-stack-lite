---
instruction_id: render-one-verdict-per-finding
title: Render one verdict per finding
summary: "Grade every finding only after every lens has reported, ignore the severity the reviewer assigned, and let the single verdict be the whole decision."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The lenses have reported and the findings are waiting to be graded.
conditions_does_not_apply_when: The findings still have to be collected from the lenses.
artifact_contract_output_type: verdicted-findings
artifact_contract_required_data:
  - the verdict of every finding
  - the evidence behind every verdict
artifact_contract_verified_by: "every finding carries exactly one verdict and a sentence or two of evidence, and none is dropped"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 1
---

# Render one verdict per finding
Once every layer has reported -- and not before -- render a verdict on each finding, ahead of any deduplication or grouping.
Disregard any severity a reviewing subagent assigned -- they lack the context to grade.
Render exactly one verdict from what verification established -- the verdict is the whole triage decision; there is no separate keep-or-dismiss.
Every finding keeps its verdict and evidence (a sentence or two) for the summary; never drop, merge, or silently skip one.
