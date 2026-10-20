---
instruction_id: write-tracer-bullet-tickets
title: Write tracer bullet tickets
summary: "Break work into tracer-bullet vertical slices, each a complete path through every layer and each declaring its blocking edges."
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: "A plan, spec or conversation must be broken into work items."
conditions_does_not_apply_when: The work is a single wide mechanical refactor.
artifact_contract_output_type: ticket-set
artifact_contract_required_data:
  - slices
  - blocking edges
  - acceptance criteria
artifact_contract_verified_by: each slice is demoable alone and its blockers are real gates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/to-tickets/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 2
---

# Write tracer bullet tickets
Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.
### Draft vertical slices
Break the work into **tracer bullet** tickets.
- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first
Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.
### Quiz the user
Present the proposed breakdown as a numbered list. For each ticket, show:
- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work
Ask the user:
- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?
Iterate until the user approves the breakdown.
Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.
Do NOT close or modify any parent issue.
In either form, avoid specific file paths or code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype.
No source-code paths or snippets; the builder reads the repo.
A snippet stays only when it is the decision itself, not an illustration of it.
A path the user wants recorded goes in Notes.
