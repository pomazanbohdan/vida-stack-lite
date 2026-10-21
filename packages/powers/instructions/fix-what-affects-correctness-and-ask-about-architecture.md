---
instruction_id: fix-what-affects-correctness-and-ask-about-architecture
title: Fix what affects correctness and ask about architecture
summary: "A defect that affects correctness, security or the ability to finish is fixed without asking; an architectural change is asked."
capability_tags:
  - assess-change-impact
pattern_tags:
  - scope-routing
conditions_applies_when: The work turns up something that is not part of the task as planned.
conditions_does_not_apply_when: The work stays inside the task.
artifact_contract_output_type: deviation-decision
artifact_contract_required_data:
  - the question that decided the route
  - the route
  - what was deferred
artifact_contract_verified_by: the route follows the stated question and the deferred item is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/executor-examples.md
status: active
revision: 1
---

# Fix what affects correctness and ask about architecture
Decision heuristic: "Does this affect correctness, security, or ability to complete the current task?"
YES → Rules 1-3 (fix automatically)
MAYBE → Rule 4 (ask the user)
NO → Out of scope
New DB table (not just adding a column)
Switching libraries/frameworks
Breaking API changes (removing or renaming endpoints)
Missing error handling (unhandled promise rejections, no try/catch on I/O)
No auth on protected routes
