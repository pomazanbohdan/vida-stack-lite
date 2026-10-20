---
instruction_id: route-review-findings-into-one-action
title: Route every review finding into one action
summary: "Surviving findings are grouped by shared root cause and each group is routed into exactly one category: an intent gap, a bad plan, a patch, or a defer."
capability_tags:
  - triage-reports
  - apply-review-feedback
pattern_tags:
  - report-triage
conditions_applies_when: A review produced findings and each of them has been verified and given a verdict.
conditions_does_not_apply_when: There are no findings to route.
artifact_contract_output_type: finding-routing
artifact_contract_required_data:
  - the surviving findings
  - the shared root cause of each group
  - the category of each group
  - the action taken for each group
artifact_contract_verified_by: every group carries exactly one category and the category follows the rules of the group
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 1
---

# Route every review finding into one action

Group the survivors by shared root cause — two findings belong in one entry only when the same defect produced both. Same location alone is not a shared root cause, and neither is a shared fix.

- An entry carries every member's verified bad outcome and the highest verdict among them

Critical > Important > Minor > maybe-false.

Route each entry into exactly one triage category.

A group that includes verified `Critical`, `Important`, or `Minor` members routes by its highest such verdict — not to defer just because a member is `maybe-false`.

The first three are **this change's problem** — caused or exposed by the current change. The last is **not this change's problem**.

**intent_gap** — caused by the change; cannot be resolved from the plan because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.

**bad_plan** — caused by the change, including direct deviations from the plan. The plan should have been clear enough to prevent it. When in doubt between bad_plan and patch, prefer bad_plan — a plan-level fix is more likely to produce coherent code.

**patch** — caused by the change; its smallest fix is trivial, adds no public surface, and guards no state you did not demonstrate. Just part of the diff. A finding whose smallest fix fails any of those conditions routes to intent_gap when the plan does not settle that fix, otherwise to bad_plan.

**defer** — pre-existing issue not caused by this change; or an entry whose members are all `maybe-false` and the claim, if true, would be `Important` or `Critical` — record that severity marked unverified, plus what would settle it (if it would only be `Minor`, reject it with the same note); or any entry whose fix edits agent-context files (CLAUDE.md, AGENTS.md, rules, etc).

All remaining findings continue to grouping.

Reject `false` findings on their refutation.

Reject `Minor` findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly — no proof needed) and the fix is more than a direct correction or deletion — adding guards, branches, parameters, or other complexity.

Out of scope: reject or defer a finding as out of scope only when the intent itself excludes it — not because the plan's scope section or the shape of the diff says so. If only those would exclude it, keep the finding: the plan drew the line somewhere the intent did not, so it routes to intent_gap or bad_plan, never to patch or defer.

Reject any finding whose fix is to edit this build's plan.
# Route each finding to exactly one disposition
If neither exists, process patch and defer normally.
An intent gap — caused by the change; cannot be resolved from the plan because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.
A plan defect — caused by the change, including direct deviations from the plan. The plan should have been clear enough to prevent it.
A patch — caused by the change; its smallest fix is trivial, adds no public surface, and guards no state you did not demonstrate.
When in doubt between a plan defect and a patch, prefer a plan defect — a plan-level fix is more likely to produce coherent code.
A `maybe-false` finding is deferred only when its claim, if true, would be Important or worse; its evidence records what would settle it.
Weaker ones are rejected in the plan's triage log with the same note.
This is intentionally not a backlog. It is a machine-readable review output.
The orchestrator has to decide what happens next: create a ticket, append to a central queue, correlate duplicates across runs, or do nothing.
