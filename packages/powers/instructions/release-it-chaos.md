---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-chaos
title: Plan failure injection safely
summary: "Treat chaos engineering as design-time planning: define steady state and hypothesis, start small outside production, require authorized engineers, approvals, blast-radius controls and rollback, and escalate gradually."
capability_tags:
  - design-production-readiness
pattern_tags:
  - chaos-safety
conditions_applies_when: Designing a failure experiment or GameDay.
conditions_does_not_apply_when: Autonomous failure injection by an agent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The experiment is planned with authorization, approvals, rollback and blast-radius controls."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L147-L173"
status: active
revision: 1
---

# Plan failure injection safely

Chaos engineering is a design-time planning activity: the patterns describe what to test and what to verify, not actions an AI agent may execute autonomously. All failure injection must be performed by authorized engineers using dedicated tooling such as Gremlin, Litmus, or AWS FIS, with proper approvals, rollback plans, and blast-radius controls. Build resilience confidence by testing realistic failures in controlled experiments: define a measurable steady state first, state a hypothesis of the form that when X fails the system will Y, start small in non-production by killing one process or adding latency to one call, and escalate gradually with approvals. Minimize blast radius with canary populations, feature flags, and an emergency stop; production experiments require explicit authorization and instant rollback. Automate recurring experiments and use GameDay exercises to test both the system and the team. Foster a culture where finding weaknesses is celebrated, not punished. Representative experiments include controlled process termination verified against SLO recovery, +500ms latency on database calls to verify circuit-breaker trip, a simulated downstream 503 to verify graceful degradation, and a scheduled GameDay such as a primary database becoming read-only.
