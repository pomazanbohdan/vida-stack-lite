---
instruction_id: run-bounded-fix-loop
title: Bound the fix loop at five rounds
summary: "Fix findings round by round, resume the same implementer for the first three rounds, and adjudicate whatever remains at the cap."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - revision-round-continuity-policy
conditions_applies_when: A review returned a confirmed finding that must be fixed.
conditions_does_not_apply_when: "There are no findings, or they are already closed by evidence."
artifact_contract_output_type: fix-loop
artifact_contract_required_data:
  - open findings
  - round
  - scoped re-review
  - ruling
artifact_contract_verified_by: a scoped re-review of each fix round
compatibility_excludes:
  - start-a-fresh-agent-for-each-revision-round
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/re-review-prompt.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Bound the fix loop at five rounds
The loop triggers when the review reports spec ❌, any Critical or Important finding, or a ⚠️ item you confirmed as a real gap.
Minor findings never enter the loop.
A finding labeled plan-mandated — or any finding that conflicts with what the plan's text requires — is yours to rule on.
Do not dismiss the finding because the plan mandates it.
A fix round is one fix dispatch plus one scoped re-review. Five rounds maximum per task.
Rounds 1-3 — resume the original implementer. Send it the open findings verbatim.
If your harness cannot send another message to a live subagent, dispatch a fresh implementer carrying the brief path, the report-file path, and the findings.
Rounds 4-5 — dispatch a fresh implementer on a more capable model, with the brief path, the report-file path, the open findings.
Every round, the implementer fixes, re-runs the tests covering the amended code, appends its fix report to the same report file, and returns the short contract.
Before re-dispatching the reviewer, confirm the fix report contains the covering tests, the command run, and the output.
The re-review is scoped: the re-reviewer verdicts each finding ADDRESSED or NOT ADDRESSED and flags new breakage in the fix diff only.
Out-of-scope observations go to the ledger as deferred minors — they never extend the loop.
Never fix findings yourself in the controller session — your context stays clean for coordination, and controller fixes skip review.
The breaker: when round 5's re-review still leaves findings open, stop dispatching.
Adjudicate each open finding yourself — you hold the plan and the cross-task context the reviewer lacks.
Adjudicating earlier to end a loop is pre-judging with a different name.
Every adjudication is a ledger entry — a silent discard is forbidden.
