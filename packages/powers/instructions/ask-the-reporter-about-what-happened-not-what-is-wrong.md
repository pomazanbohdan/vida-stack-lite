---
instruction_id: ask-the-reporter-about-what-happened-not-what-is-wrong
title: "Ask the reporter about what happened, not what is wrong"
summary: "The reporter is asked what they expected, what happened and what they saw; the cause, the file and the fix are investigated, not asked."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A bug report is received and the details are still missing.
conditions_does_not_apply_when: The cause is already known.
artifact_contract_output_type: reporter-questions
artifact_contract_required_data:
  - what was expected
  - what actually happened
  - the errors that were seen
  - when it started
artifact_contract_verified_by: "no question asks the reporter for a cause, a file or a fix"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 1
---

# Ask the reporter about what happened, not what is wrong
The user knows:
What they expected to happen
What actually happened
Error messages they saw
When it started / if it ever worked
The user does NOT know (don't ask):
What's causing the bug
Which file has the problem
What the fix should be
Ask about experience. Investigate the cause yourself.
