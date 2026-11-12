---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-clean-architecture-skill-md-f18aa6a5-c01"
title: "wondelai-skills: skills/clean-architecture/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/clean-architecture/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/clean-architecture/SKILL.md\"}"
atom_ids:
  - clean-architecture-adapters-and-frameworks
  - clean-architecture-apply
  - clean-architecture-boundaries
  - clean-architecture-common-mistakes
  - clean-architecture-component-principles
  - clean-architecture-concentric-circles
  - clean-architecture-dependency-rule
  - clean-architecture-diagnostic
atom_count: 8
atoms: "[{\"atom_id\":\"clean-architecture-adapters-and-frameworks\",\"file_sha256\":\"7e1ca71c0fd5bea3afc4aaee922dc9875c71b8c998189b522cd0791014e38cf6\",\"content_sha256\":\"1b988b3811fa2edaf3a9c6db157b2ed2808d9754ffe222f094ba995152871769\",\"file_bytes\":1756,\"body_bytes\":620},{\"atom_id\":\"clean-architecture-apply\",\"file_sha256\":\"6870980ecc7d70a43ab11c90350151bdebe323db2332e18c95f7b0517646544f\",\"content_sha256\":\"49e23860fd5fd463009a268b961178f7ee0bc0a97e662288ca8fd863d7c5d27f\",\"file_bytes\":1480,\"body_bytes\":282},{\"atom_id\":\"clean-architecture-boundaries\",\"file_sha256\":\"0e841c875dcd8d982ef071f13a66275551c0427ce69434380e41dd58b919e1ce\",\"content_sha256\":\"f05667af3383a430e0acee132599ee3fd36cd201e0414bc321f111f9f733a2f1\",\"file_bytes\":1925,\"body_bytes\":761},{\"atom_id\":\"clean-architecture-common-mistakes\",\"file_sha256\":\"e76de4a8f4870a5216f575b5dcee41bd05995f645baeb3fdd63f1ebecb4c6758\",\"content_sha256\":\"f0704604b9f509e3ebf0e9560de1e579c6a75c7d5ce9065ba3c83d1016beaead\",\"file_bytes\":1936,\"body_bytes\":835},{\"atom_id\":\"clean-architecture-component-principles\",\"file_sha256\":\"b0d20265c6ad92a2c90666c4b423e49e1dc15528dffbc581f25590122cc841f8\",\"content_sha256\":\"bf92e0913ecb8bba0a8eb569b8dd11fd6610df547968132f144aace9c7eaa695\",\"file_bytes\":1728,\"body_bytes\":620},{\"atom_id\":\"clean-architecture-concentric-circles\",\"file_sha256\":\"452f45141dd1dd4cf560eaf8a3745a7e4cd2f26b0fa4596ead30fced2296f0ee\",\"content_sha256\":\"92b7b4a2fdc6b151ee2e95373512037a2b5f219b806d78593e7ee4577fb6e259\",\"file_bytes\":1874,\"body_bytes\":709},{\"atom_id\":\"clean-architecture-dependency-rule\",\"file_sha256\":\"c5a287116df5d2f3964dbbd4927f6473e19e068ad4e9c8f2fc11eb6c9e0111c7\",\"content_sha256\":\"7a74b877b921fde81a8ee6c4d497a07a0dfcc4ac9262389511842b7b8d794416\",\"file_bytes\":1511,\"body_bytes\":398},{\"atom_id\":\"clean-architecture-diagnostic\",\"file_sha256\":\"5964595f8c011394be6bbbce2c77f844693138c57ff32607d2ed0c2f913196dd\",\"content_sha256\":\"3a0ff4f7d7183db52be10e397af8e7f2acf7d6b2504c35289cca3c2bf66b67df\",\"file_bytes\":2061,\"body_bytes\":876}]"
carrier_sha256: 54374ad7a2a05357322f83aad1fc9fdc975ed5dbd9c65f14e49a9edc536cc917
carrier_bytes: 15270
revision: 1
status: active
---
<!-- vpmodule:atom:begin clean-architecture-adapters-and-frameworks -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-adapters-and-frameworks
title: Keep adapters and frameworks at the edge
summary: "Translate between use-case forms and external forms; controllers, presenters and gateways keep frameworks replaceable."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Integrating HTTP, persistence or another external mechanism."
conditions_does_not_apply_when: A pure library with no external boundary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Business rules do not import the framework, and adapters translate at the boundary."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L69-L91"
status: active
revision: 1
---

# Keep adapters and frameworks at the edge

Interface Adapters convert data between forms convenient for Use Cases or Entities and forms required by external agencies. Keep Frameworks and Drivers in the outermost layer as glue. Controllers translate HTTP into Use Case input; Presenters translate Use Case output into view models; Gateways implement repository interfaces defined by Use Cases. Business rules must not depend on whether data is stored in SQL, NoSQL, or flat files, or on HTTP delivery. Keep frameworks at arm's length: the framework calls inward, and inner controllers or business code do not import it.
<!-- vpmodule:atom:end clean-architecture-adapters-and-frameworks -->
<!-- vpmodule:atom:begin clean-architecture-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-apply
title: Apply Clean Architecture when designing architecture
summary: "Keep business rules independent of frameworks, databases and delivery when designing architecture or reviewing module boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Designing system architecture, reviewing module boundaries or advising on dependency management."
conditions_does_not_apply_when: A local implementation choice with no architectural dependency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design keeps business rules independent of frameworks, databases and delivery."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply Clean Architecture when designing architecture

Use Clean Architecture when designing software architecture, reviewing module boundaries, or advising on dependencies: structure software so business rules remain independent of frameworks, databases, and delivery mechanisms.
<!-- vpmodule:atom:end clean-architecture-apply -->
<!-- vpmodule:atom:begin clean-architecture-boundaries -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-boundaries
title: Draw boundaries between policy and details
summary: "Use reciprocal interfaces, Humble Object, inward dependencies and volatility points; services are not automatically boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Placing an architectural boundary or integrating a service.
conditions_does_not_apply_when: A boundary already fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The boundary separates policy from detail, dependencies point inward and the placement tradeoff is stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L141-L163"
status: active
revision: 1
---

# Draw boundaries between policy and details

A boundary separates what matters from details and uses polymorphism: dependencies cross inward, while control flow may cross either way. Full boundaries use reciprocal interfaces on both sides; partial boundaries may use a simpler strategy or facade. Use the Humble Object pattern to separate hard-to-test boundary code from easy-to-test logic. A service is not automatically an architectural boundary; a microservice with a fat shared data model remains a monolith with network calls. Tests are the most isolated component: they depend inward and nothing depends on them. Avoid premature boundaries, but draw them at likely volatility points. Main is the composition root that assembles concrete implementations.
<!-- vpmodule:atom:end clean-architecture-boundaries -->
<!-- vpmodule:atom:begin clean-architecture-common-mistakes -->
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
<!-- vpmodule:atom:end clean-architecture-common-mistakes -->
<!-- vpmodule:atom:begin clean-architecture-component-principles -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-component-principles
title: Apply component cohesion and coupling principles
summary: "Use REP, CCP, CRP, ADP, SDP and SAP to shape a stable acyclic component graph."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Grouping classes into deployable components.
conditions_does_not_apply_when: A single-component application with no component graph.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The component graph is acyclic, depends toward stability, and stable components are abstract."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L92-L115"
status: active
revision: 1
---

# Apply component cohesion and coupling principles

Treat components as units of deployment. REP: classes in a component are versionable and releasable together; CCP: classes changing for the same reason belong together; CRP: users need not depend on unused classes. Keep the component graph acyclic (ADP), depend toward stability (SDP), and make stable components abstract and unstable ones concrete (SAP). Group classes that change together; break cycles with dependency inversion or a new abstraction component. Instability is I = Ce / (Ca + Ce); many incoming and no outgoing dependencies give I near zero (stable).
<!-- vpmodule:atom:end clean-architecture-component-principles -->
<!-- vpmodule:atom:begin clean-architecture-concentric-circles -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-concentric-circles
title: Organize code in concentric circles
summary: "Use Entities, Use Cases, Interface Adapters and Frameworks/Drivers; dependencies point inward and boundary data favors the inner circle."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Structuring an application into architectural layers.
conditions_does_not_apply_when: A single-layer script with no architectural boundary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The layers form concentric circles, dependencies point inward, and boundary data uses the inner form."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L22-L44"
status: active
revision: 1
---

# Organize code in concentric circles

Organize architecture as concentric circles with Entities innermost, then Use Cases, Interface Adapters, and Frameworks and Drivers outermost; source dependencies must always point inward. Inner circles must not mention outer-circle names, classes, functions, variables, or data formats, and boundary data must use the form most convenient for the inner circle rather than the outer. Define interfaces inward and implement them outward through Dependency Inversion. The number of circles is not fixed (four is typical); frameworks are details in the outermost circle. This direction lets high-level policies survive changes to databases, web frameworks, and API styles.
<!-- vpmodule:atom:end clean-architecture-concentric-circles -->
<!-- vpmodule:atom:begin clean-architecture-dependency-rule -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-dependency-rule
title: Point source dependencies inward
summary: Source-code dependencies point toward higher-level policies; inner circles know nothing of outer circles.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Laying out modules, packages or layers."
conditions_does_not_apply_when: A dependency fixed by an external platform that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every source dependency points inward and inner code does not mention outer types or formats.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L14-L17"
status: active
revision: 1
---

# Point source dependencies inward

Source-code dependencies must point inward toward higher-level policies; inner circles must not know anything about outer circles. This keeps business rules independent of frameworks, UI, databases, and other external agencies, so details can depend on policies and implementations can be deferred or swapped while business logic remains independently testable.
<!-- vpmodule:atom:end clean-architecture-dependency-rule -->
<!-- vpmodule:atom:begin clean-architecture-diagnostic -->
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
<!-- vpmodule:atom:end clean-architecture-diagnostic -->