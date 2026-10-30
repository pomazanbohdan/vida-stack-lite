---
instruction_id: parallelize-independent-tasks
title: Dispatch one agent per independent problem
summary: "Run independent investigations concurrently, one agent per problem domain, with context you construct yourself."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Two or more tasks are independent and can be worked on without shared state or sequential dependencies.
conditions_does_not_apply_when: "The failures are related, the full state of the system matters, or the agents would interfere with each other."
artifact_contract_output_type: task-allocation
artifact_contract_required_data:
  - one task per independent domain
  - the context each agent receives
  - the point where the results are merged
artifact_contract_verified_by: each dispatched task names its own domain and its own context
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/dispatching-parallel-agents/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Dispatch one agent per independent problem

When you have multiple unrelated failures — different test files, different subsystems, different bugs — investigating them sequentially wastes time, because each investigation is independent and can happen in parallel.

Core principle: dispatch one agent per independent problem domain and let them work concurrently.

You delegate tasks to specialised agents with isolated context: they should never inherit your session context or history, and you construct exactly what they need. This also preserves your own context for the coordination work.

Use this when three or more test files fail with different root causes, when several subsystems are broken independently, when each problem can be understood without the context of the others, and when no state is shared between the investigations.

Do not use it when the failures are related and fixing one might fix the others, when the full state of the system has to be understood first, or when the agents would interfere with each other.
