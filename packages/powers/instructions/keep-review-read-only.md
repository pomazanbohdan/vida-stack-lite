---
instruction_id: keep-review-read-only
title: Run the review and the report without changing the environment
summary: "Review the checkout read-only, do the review yourself, and keep one-shot reports from changing the mode or the stored state."
capability_tags:
  - review-code
pattern_tags:
  - code-review
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
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-help/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-gain.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-help.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-help/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-02-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-contract.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/reference/skills-and-agents.md
status: active
revision: 4
---

# Run the review and the report without changing the environment
Your review is read-only on this checkout.
Do not mutate the working tree, the index, HEAD, or branch state in any way.
Inspect history without changing it.
If you need a working copy of a different revision, check it out into a separate temporary directory.
Never move HEAD on this checkout.
Do all of this review yourself.
Never spawn a subagent to review part of the diff, and never spawn another reviewer for a second opinion.
This process already provides every review seat the work gets; a reviewer you spawn duplicates one of them at full cost, and its verdict counts for nothing.
If the diff feels too large for one pass, review it in passes yourself and say so in your report.
Lists findings, changes no code.
One-shot report, changes no code.
Reads and reports only, changes nothing.
To persist it, ask and it writes the ledger to a file.
One-shot: do not change mode, write flag files, or persist anything.
One-shot display: edits nothing, changes no mode.

When an instruction launches a reviewer subagent, launch that child with the prompt text after placeholder substitution; do not load the reviewer instruction file yourself.
you also need to decide: should this automatic reviewer build, run tests and fix the code?
If not, say so when invoking the skill.
This tells the review session to output the findings in a form you can pass directly to the coding agent and stop at that.
The two editorial lenses hold content sacrosanct: they critique only how a document is organized and expressed, and they propose changes rather than making them.
Zero findings is a valid outcome; it never pads to look thorough.
