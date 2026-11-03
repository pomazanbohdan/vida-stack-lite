---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-diagnostic
title: Run the clean-architecture diagnostic
summary: "Check testability without infrastructure, inward dependencies, swappable database, delivery independence, framework placement, acyclic components and Main wiring."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of an architecture.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and applies the matching remedy.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L176-L187"
status: active
revision: 1
---

# Run the clean-architecture diagnostic

Use the diagnostic questions to assess whether business rules can be tested without a database, web server, or framework; dependencies point inward; the database can be swapped without changing business logic; Use Cases are independent of delivery; frameworks stay outermost; components have no cycles; and Main (the composition root) wires dependencies. If any answer is no, apply the corresponding action: extract entities and Use Cases behind interfaces and mock outer layers; introduce boundary interfaces and invert the offending dependency; isolate persistence in adapters; use plain DTOs in Use Case signatures; wrap framework calls behind interfaces and push them to the edges; break every cycle with ADP using Dependency Inversion or new components; and move construction out of inner circles into Main using DI or factories.
