---
instruction_id: give-every-finding-a-disposition
title: Give every finding a disposition
summary: "Every finding in the log carries one of four dispositions, and a changed disposition is appended, never rewritten."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A finding is written into the review log.
conditions_does_not_apply_when: The log entry carries no finding.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the finding
  - its disposition
artifact_contract_verified_by: "each finding names one of fixed, accepted as-is, deferred, or open"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reviews.md
status: active
revision: 2
---

# Give every finding a disposition
In Result, give each finding's disposition: fixed, accepted as-is, deferred, or open. When a disposition changes, append a new entry; do not edit earlier ones.
**Record a per-finding disposition.** The counts say how many findings there were, not what happened to any of them.
one row per finding ID, defaulting to `open`
preserving any disposition already recorded, its stated reason included.
Prior rows: keep the disposition AND its source cell — the source is where a human writes the reason a finding was deferred
A prior finding the current review no longer reports is CARRIED, never dropped
the row does not claim the finding is live, it records that it was seen and never triaged.
The disposition column is an ENUM, not 'any lowercase token'.
A row that does not match now yields no prior entry, so the row falls back to 'open' -- the safe default
the id now names a different finding, so the decision no longer has a row
The review file is an audit trail and feedback input, not a second execution contract: every current actionable finding must be incorporated into the relevant plan or explicitly deferred/rejected in that plan.
**Append-only.** A later round never edits or deletes a prior round's tables. To overturn a prior round's verdict, add a new row in the current round's table whose Reason/How Addressed names the round and concern it supersedes.
**Anchoring.** Any reference to a specific review line cites the line and the snapshot it belongs to - a bare line number is meaningless once the next round rewrites the file wholesale.
