---
instruction_id: hand-over-the-review-as-a-fix-brief
title: Hand over the review as a fix brief
summary: "Write one block a coding agent can fix the findings from without redoing the review: the base and the commit by full SHA, what is wrong and how you know, what the fixed code should do, and how to check it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - code-review
conditions_applies_when: The review is handed to another agent that is to apply the findings.
conditions_does_not_apply_when: The findings are applied in this session.
artifact_contract_output_type: review-handoff
artifact_contract_required_data:
  - the base and the reviewed commit
  - what is wrong and how you know
  - the outcome the fixed code should have
  - how to check the fix
  - "the findings that are not the other agent's to fix"
artifact_contract_verified_by: "the brief names the range, carries an outcome and a check per patch finding, and never claims that a fix was verified"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-04-present.md
status: active
revision: 1
---

# Hand over the review as a fix brief
Write one Markdown block a coding agent can fix the findings from without redoing the review.
Name the base it was compared to by full SHA, and the reviewed commit the same way, or say that the change is uncommitted on top of the base.
Then, for each `patch` finding (including any resolved from `decision-needed`): what is wrong and how you know; the files or symbols it touches; what the fixed code should do, as an outcome, not a recipe; and how to check the fix, including anything that has to be run to confirm the defect.
If there are no `patch` findings, say so.
Then, under their own headings, list the `decision-needed` findings still unresolved and the `defer` findings, each with its reason, so the agent knows they are not its to fix.
Nothing was run in this review, so never claim a fix works or a check passed.
