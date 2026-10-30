---
instruction_id: record-skipped-steps-with-reason
title: Record a skipped step with its reason
summary: "A step you choose not to do stays visible with a one-line reason, and a skipped entry point is never reported as verified through another path."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: Part of the planned steps or checks was not carried out.
conditions_does_not_apply_when: Every planned step ran and its evidence exists.
artifact_contract_output_type: skip-ledger
artifact_contract_required_data:
  - step
  - reason
  - attempted command
  - unmet precondition
  - effect
artifact_contract_verified_by: the report lists every skipped step and its effect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/10-recipes-and-pitfalls.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/bootstrap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record a skipped step with its reason
A step you choose not to do stays in the list with a one-line skip and its reason.
The step stays visible, so the reader can see what you chose not to do.
Every step names the evidence that checks it.
Check a step only when its evidence exists: a file, a log line, a screenshot, a test run, or a SHA.
Report an unreachable path with the attempted command and the unmet precondition.
Do not report a skipped entry point as verified through a different path.
When a check couldn't run, a good reply says inconclusive.
Treat a confident reply without evidence as a red flag.
If it repros on main lets the run stop early when the bug is already gone, and the reproduction result is the reason.
If there's a cheap test path matters: forcing a test through brittle mocks proves less than running the real command, and the playbook is allowed to say so.
A build proves it compiles, so ask for the real command, flow, stored value, or profile, and expect the evidence in the reply.
A vague finish condition gives the loop nothing to check, so give a command or artifact that can pass or fail.
Name each skip with what it leaves unproven.
A skip that changes confidence in the result is stated as such.
The report never reads as complete when a step is skipped.
- **Exception (ADR/doc-only PRs):** if the diff is documentation-only (for example `docs/adr/*.md`, `docs/**/*.md`, `README*.md`) and contains no executable-code or test changes, the cross-platform run is optional.
- When using the doc-only exception, note it explicitly in the PR body.
