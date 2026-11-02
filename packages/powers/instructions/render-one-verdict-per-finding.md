---
instruction_id: render-one-verdict-per-finding
title: Render one verdict per finding
summary: "Grade every finding only after every lens has reported, ignore the severity the reviewer assigned, and apply one rubric based on the impact of a single occurrence rather than its rarity or fix cost."
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
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Render one verdict per finding
Once every lens has reported — and not before — render a verdict on each finding, ahead of any grouping.
Disregard any severity a reviewing subagent assigned — they lack the context to grade.
Render exactly one verdict from what verification established — the verdict is the whole triage decision; there is no separate keep-or-dismiss:
`Critical` — data loss or corruption, a security exposure, a silently wrong result, or a path broken with no workaround.
`Important` — broken or wrong, but noticed and worked around, or limited in reach.
`Minor` — cosmetic or a minor inconvenience.
`false` — the finding is not real.
`maybe-false` — you cannot decide whether the finding is real; use it only when the diff and surrounding code leave the question open.
A gap finding from the verification-gap lens is `Important`; skip grading it.
Severity is the impact of a single occurrence. It does not depend on how rare the outcome is, how hard it is to fix, or whether the defect predates the change. If you cannot decide between `Important` and `Minor`, pick `Important`.
Every finding keeps its verdict and a sentence of evidence for the summary; never drop, merge, or silently skip one.
