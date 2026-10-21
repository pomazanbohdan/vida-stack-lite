---
instruction_id: log-the-choice-you-made-on-behalf-of-the-user
title: Log the choice you made on behalf of the user
summary: Every choice made without the user is written down where the user can audit it.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - unattended-execution
conditions_applies_when: A choice is made without asking the user.
conditions_does_not_apply_when: The user answered and the choice is theirs.
artifact_contract_output_type: decision-log
artifact_contract_required_data:
  - the question
  - the chosen option
  - the reason it was the default
artifact_contract_verified_by: every choice made without the user is written where the user can audit it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/auto.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/eval-review.md
status: active
revision: 1
---

# Log the choice you made on behalf of the user
for each discussion question, choose the recommended option (first option, or the one explicitly marked "recommended") **without using AskUserQuestion**. Skip interactive prompts entirely.
Log each auto-selected choice inline so the user can review decisions in the context file
Log every decision so the user can audit.
an unattended run reuses an existing artifact instead
