---
instruction_id: record-review-findings-in-the-plan
title: Record the review findings in the plan
summary: "Append a dated block to the plan's code-review section — decision-needed first, then patch, then defer — and never change the plan's status."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has findings and a plan document that is the record of this work.
conditions_does_not_apply_when: "There is no plan document, or the plan is not where this work is recorded."
artifact_contract_output_type: recorded-findings
artifact_contract_required_data:
  - the dated block
  - the findings by bucket
  - the deferred list
artifact_contract_verified_by: "the plan carries the dated block with the findings in order, and every deferred finding also appears in the deferred list"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-04-present.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 2
---

# Record the review findings in the plan
When `{plan_file}` is set, always write findings to it before offering action choices.
Never change a plan's `status`. The build leaves it at `built`; only the user marks a ticket done.
If `{plan_file}` is set, append a block to its `## Code Review` section, creating that section at the end of the file when it is absent.
The block opens with `### {date}` and the summary line from section 3, then the findings below, then the `Rejected` appendix.
Write all findings in this order:
`decision-needed` findings (unchecked): `- [ ] [Review][Decision] <Title> — <Detail> Options: <each option, one line>. Recommended: <option> — <reason>.`
`patch` findings (unchecked): `- [ ] [Review][Patch] <Title> [<file>:<line>]`
`defer` findings (checked off, marked deferred): `- [x] [Review][Defer] <Title> [<file>:<line>] — deferred: <pre-existing, or for maybe-false the evidence that would settle it>`
Also append each `defer` finding to `{deferred_work_file}` under a heading `## Deferred from: code review ({date})`.
One bullet per finding with description.
If the user chooses to defer, ask: Quick one-line reason for deferring this item? (helps future reviews): — then append that reason to both the finding's bullet in `{plan_file}` and the `{deferred_work_file}` entry.
Each run adds a dated block with that run's findings. Deferred findings go into the same block.
