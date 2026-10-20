---
instruction_id: find-the-feature-to-cover-in-a-fixed-order
title: Find the feature to cover in a fixed order
summary: "The feature to cover is looked for in a fixed order, and the first source that identifies it wins."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: The feature that the new tests must cover is not yet named.
conditions_does_not_apply_when: The feature is already named in the request.
artifact_contract_output_type: test-scope
artifact_contract_required_data:
  - the source that identified the feature
  - the feature to cover
artifact_contract_verified_by: the search stopped at the first source that named the feature
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 1
---

# Find the feature to cover in a fixed order
Find the feature to cover. Check in this order and stop at the first that identifies it:
- **Request or recent conversation.** The triggering prompt and the conversation before it name the feature, flow, directory, or ticket; act on them, and do not start from a blank slate.
- **The ticket tree.** Otherwise offer the `tickets` rows whose `state` is `review`, `<ref>` and `<title>` each, plus a choice of another target, and HALT for the user's pick. With none, or another target chosen, continue.
- **Current git state.** If HEAD is not on the default branch, confirm that the feature is what this branch changed against the default branch. HALT for the answer.
- **Ask.** HALT and ask the user what to cover, offering to list the features with no end-to-end coverage, ordered by how much a regression would hurt.
