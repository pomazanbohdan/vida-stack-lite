---
instruction_id: answer-the-three-questions-before-you-pass-a-blocking-anti-pattern
title: Answer the three questions before you pass a blocking anti-pattern
summary: A recorded blocker is passed only after the three questions are answered in writing.
capability_tags:
  - verify-work-results
pattern_tags:
  - technical-debt
conditions_applies_when: A recorded anti-pattern is marked as blocking the work.
conditions_does_not_apply_when: "The recorded item is a warning or a note, not a blocker."
artifact_contract_output_type: anti-pattern-review
artifact_contract_required_data:
  - the anti-pattern
  - how it manifested
  - the structural mechanism that prevents it
artifact_contract_verified_by: all three answers are written before the work continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Answer the three questions before you pass a blocking anti-pattern
the agent must demonstrate understanding of each by answering all three questions for each one:
1. **What is this anti-pattern?** — Describe it in your own words.
2. **How did it manifest?** — Explain the specific failure that caused it to be recorded.
3. **What structural mechanism (not acknowledgment) prevents it?** — Name the concrete step or enforcement mechanism that stops recurrence.
Write these answers inline before continuing.
stop and ask the user for clarification.
