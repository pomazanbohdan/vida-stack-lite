---
instruction_id: count-the-unresolved-issues-not-the-raw-issues
title: "Count the unresolved issues, not the raw issues"
summary: An issue counts as unresolved unless it was verified as resolved; a test with several issue records stays unresolved while any one of them is open.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: The number of issues decides what happens next.
conditions_does_not_apply_when: Every recorded issue is still open.
artifact_contract_output_type: unresolved-issue-count
artifact_contract_required_data:
  - the count
  - the entries that were counted
  - the entries that were treated as resolved
artifact_contract_verified_by: only the entries without a verified resolution were counted and one open regression kept its test unresolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/detail/elaboration.md
status: active
revision: 1
---

# Count the unresolved issues, not the raw issues
`unresolved_issues`: tests with `result: issue` that are NOT a verified gap resolution (#4983) — same criterion `phase uat-passed` uses (`src/uat-predicate.cts`).
A `result: issue` test is a verified resolution only when its `## Gaps` entry (matched by `test:`) has ALL of:
`status: resolved` (case-insensitive);
a non-empty `resolved_by`;
If a test has more than one `## Gaps` entry (a later regression re-opens the same test number with a fresh `gap_id`, per § 1), it only counts as resolved when EVERY entry for that test number is a verified resolution — one open regression is enough to keep the test unresolved.
