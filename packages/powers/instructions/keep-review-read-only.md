---
instruction_id: keep-review-read-only
title: Run the review and the report without changing the environment
summary: "Review the checkout read-only, do the whole review yourself, and report the findings without changing code or state."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - review-execution-policy
  - review-application-policy
  - review-fix-application-policy
conditions_applies_when: You review a change or produce a one-shot report in a checkout you do not own.
conditions_does_not_apply_when: You are the author working on the change.
artifact_contract_output_type: read-only-review
artifact_contract_required_data:
  - review scope
  - state before
  - state after
artifact_contract_verified_by: the working tree is unchanged after the review
compatibility_excludes:
  - hand-the-review-prompt-to-a-separate-session-when-no-subagent-exists
  - run-the-review-lenses-as-one-blocking-batch
  - run-the-lenses-and-fix-what-they-find
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/requesting-code-review/code-reviewer.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/task-reviewer-prompt.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 6
---

# Run the review and the report without changing the environment
Your review is read-only on this checkout.
Do not mutate the working tree, the index, HEAD, or branch state in any way.
Use tools like `git show`, `git diff`, and `git log` to inspect history.
If you need a working copy of a different revision, check it out into a separate temporary directory.
Never move HEAD on this checkout.
Do all of this review yourself.
Never spawn a subagent to review part of the diff, and never spawn another reviewer for a second opinion.
This process already provides every review seat the work gets; a reviewer you spawn duplicates one of them at full cost, and its verdict counts for nothing.
If the diff feels too large for one pass, review it in passes yourself and say so in your report.
Lists findings, changes no code.
