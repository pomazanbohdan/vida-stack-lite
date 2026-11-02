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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/executor-examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
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
