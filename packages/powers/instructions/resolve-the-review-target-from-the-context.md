---
instruction_id: resolve-the-review-target-from-the-context
title: Resolve the review target from what was given
summary: "Take the target from the prompt and the conversation, then fall back through the ticket tree, the current branch state, and finally the question."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A code review is starting and the target of the review is not yet fixed.
conditions_does_not_apply_when: The review target is already fixed and the diff for it is already staged.
artifact_contract_output_type: review-target
artifact_contract_required_data:
  - the review target
  - the source the target was taken from
artifact_contract_verified_by: "the target is named before the review starts, and the place it was taken from is stated"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-01-gather-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Resolve the review target from what was given
The triggering prompt and the conversation before it name the review target — act on them; do not start from a blank slate.
Find the review target. Check in this order and stop at the first that identifies it:
Request or recent conversation. A PR (resolve via `gh pr view`; if that fails, ask for a SHA or branch), commit, branch, commit range, staged or uncommitted changes, a provided diff or file list, or a plan file.
The ticket tree. Otherwise offer the `tickets` rows whose `state` is `review`, `<ref>` and `<title>` each, plus a choice of another target, and HALT for the user's pick.
Current git state. If HEAD is not on the default branch, confirm: "I see HEAD is `<short-sha>` on `<branch>` — do you want to review this branch's changes?" If confirmed, it is a branch diff against the default branch.
Ask. HALT. Ask the user what to review: uncommitted changes, staged changes, a branch diff (which base), a commit range, or a provided diff or file list.
