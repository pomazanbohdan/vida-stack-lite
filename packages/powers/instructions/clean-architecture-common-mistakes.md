---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-common-mistakes
title: Avoid common clean-architecture mistakes
summary: "Avoid ORM leakage, business rules in controllers, framework-first structure, cycles, giant use cases and microservice assumptions."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing an architecture for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names each mistake and its correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L164-L175"
status: active
revision: 1
---

# Avoid common clean-architecture mistakes

Avoid ORM leakage into business logic, business rules in controllers, framework-first structure, circular component dependencies, one giant Use Case per feature, skipping boundaries merely because a system is simple, and assuming microservices are automatically good architecture. Instead separate domain entities from persistence models and map in adapters; move controller logic into focused Use Case Interactors; treat frameworks as plugins and organize by business capability; break cycles with Dependency Inversion or a shared abstraction component; split into focused single-operation Use Cases; draw boundaries proactively at likely volatility; and apply the Dependency Rule within and across services, treating services as deployment boundaries rather than architectural boundaries.
