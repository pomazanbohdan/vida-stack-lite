---
instruction_id: run-final-change-review
title: Run one final review of the whole change
summary: "Review the whole branch from its merge base on a fresh context, then fix Critical and Important findings in one TDD pass and defer the minors."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Every task in the plan is finished and the change is ready for a whole-branch review.
conditions_does_not_apply_when: "A task is still running, or the change already passed a final review."
artifact_contract_output_type: final-change-review
artifact_contract_required_data:
  - merge base
  - findings list
  - fix records
  - residual findings
artifact_contract_verified_by: "one whole-branch review, a RED then GREEN record per fix, and a green full suite"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run one final review of the whole change
Run the review package for the merge base and head, and review from the file it prints.
With a subagent tool, dispatch the reviewer on the most capable available model — the whole-branch review is a judgment task.
This is the one fresh context the whole run buys. Do not skip it, and do not replace it with your own read of the diff.
Without a subagent tool, perform that review yourself against the package, as a separate pass after the last task's ledger line.
Sort the findings before you act on any of them. The reviewer's severity labels are advice; the gate is yours.
Re-grade first, by effect: a finding's grade is what a reasonable person using this software gets if it ships.
Critical and Important enter the fix pass.
Fix the Critical and Important findings yourself in ONE pass.
Each fix is verified by TDD: write the test that reproduces the finding, watch it fail, make it pass, then run the whole suite.
A fix without a test that failed first is not verified; a suite that is not green after the pass means the pass is not over.
Do not dispatch a re-review: it would re-read a diff whose covering tests already answer "addressed".
Minor goes to the ledger as `Final: minor (deferred): <one-liner>`.
Minor findings never enter the fix pass.
There is no second fix pass.
A finding you decide not to fix is a ruling and reaches your human partner in the rulings list.
