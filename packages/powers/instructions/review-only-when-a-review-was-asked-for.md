---
instruction_id: review-only-when-a-review-was-asked-for
title: Review only when a review was asked for
summary: "A review runs only when the request asks for one; a request to act on earlier feedback is a change, and an uninvited review never happens."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - guidance-selection
conditions_applies_when: "A change, a pull request or an artifact could be reviewed, and it is not yet clear that a review was asked for."
conditions_does_not_apply_when: "The user asked for a review, or another skill asked for one explicitly."
artifact_contract_output_type: review-trigger
artifact_contract_required_data:
  - the ask that names the review
  - what is being reviewed
artifact_contract_verified_by: "the review runs on an explicit ask, and a request to act on feedback is handled as a change"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 1
---

# Review only when a review was asked for
Use when, and only when, the user asks you to review a diff, a pull request, or an artifact — code or documents, one or many — and actually says "review";
Directive from another skill counts as that ask.
A request to act on feedback from an earlier review is a change, not a review.
Never invoke this uninvited, including on edits you just made.
