---
instruction_id: cite-a-line-number-and-a-concrete-fix-for-every-finding
title: Cite a line number and a concrete fix for every finding
summary: "A finding names the file, the line, the problem and the fix; a vague location or a missing fix is not acceptable."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A finding is written.
conditions_does_not_apply_when: The finding is an observation with no fixable location.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the file
  - the line
  - the problem
  - the fix
artifact_contract_verified_by: "every finding names a file, a line and a fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 1
---

# Cite a line number and a concrete fix for every finding
DO use line numbers. Never "somewhere in the file" — always cite specific lines.
Each finding MUST include:
file: Full path to file
line: Line number or range (e.g., "42" or "42-45")
issue: Clear description of the problem
fix: Concrete fix suggestion (code snippet when possible)
DO NOT report issues in test files unless they affect test reliability (e.g., missing assertions, flaky patterns).
