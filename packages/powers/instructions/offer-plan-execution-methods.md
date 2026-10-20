---
instruction_id: offer-plan-execution-methods
title: Offer the execution method and wait for the choice
summary: "After the plan is saved, ask the owner to review it, present subagent-driven and inline execution with one recommendation, and wait."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan is ready for the owner to review and execute.
conditions_does_not_apply_when: The owner already supplied an execution method for this plan.
artifact_contract_output_type: execution-method-choice
artifact_contract_required_data:
  - plan
  - methods
  - recommendation
  - owner choice
artifact_contract_verified_by: the owner confirms the plan and the execution method
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 2
---

# Offer the execution method and wait for the choice
After saving and self-reviewing the plan, link it for your human partner to read.
Plan complete and saved.
Please review the plan.
If they have already explicitly supplied an execution method, ask them to review the plan and confirm it captures what they want; wait for that review before implementation, then use the preserved method.
Otherwise, ask them to review the plan and choose an execution method before implementation.
Subagent-driven: a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end.
It is the most thorough; it costs a fresh context per task and per review.
Native: I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch.
It is the cheapest and fastest; there is no independent review until the end.
For this plan I recommend one of the two, because of how much the tasks depend on each other's interfaces, how many there are, and what a shipped mistake would cost.
Does the plan capture what you want, and which approach should we use?
If subagent-driven is chosen, load subagent-driven development.
If native is chosen, load executing plans.
Do not start implementation before the plan is confirmed.
Do not choose the method silently.
