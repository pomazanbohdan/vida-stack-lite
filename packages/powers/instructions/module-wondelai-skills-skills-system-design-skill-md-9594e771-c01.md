---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-system-design-skill-md-9594e771-c01"
title: "wondelai-skills: skills/system-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/system-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/system-design/SKILL.md\"}"
atom_ids:
  - system-design-building-blocks
  - system-design-common-mistakes
  - system-design-database-scaling
  - system-design-diagnostic
  - system-design-estimate
  - system-design-four-step-process
  - system-design-known-patterns
  - system-design-operations
atom_count: 8
atoms: "[{\"atom_id\":\"system-design-building-blocks\",\"file_sha256\":\"e3b8901fc6a1bdd1b6da932972d8832a6f8e61e28006421be4b04e2e4e13e31e\",\"content_sha256\":\"e529d2039084152a75e8674ff86b49576980ea18816a9ab81543837831a4d5f5\",\"file_bytes\":1518,\"body_bytes\":342},{\"atom_id\":\"system-design-common-mistakes\",\"file_sha256\":\"5ee83a0253bac0f62e2d256821fb78257b8dc5354e9b5b569cfb29f8db28702d\",\"content_sha256\":\"25f38a3760312761e7e1ad1c07a385c20b3c14050785e373870550ef562aeb4f\",\"file_bytes\":1451,\"body_bytes\":302},{\"atom_id\":\"system-design-database-scaling\",\"file_sha256\":\"e567756a359622feb020460439d964b74599d2012bc98f7ef0f8298b1c962627\",\"content_sha256\":\"a3e9d04ad0d69d6bcffbcd9e3d25a3c3ec568828e05c45b600bca5a8032e52d2\",\"file_bytes\":1520,\"body_bytes\":345},{\"atom_id\":\"system-design-diagnostic\",\"file_sha256\":\"d8b206f8050837a77c0fdc12138c90f1b57387b2736a13f67e55fff11885722d\",\"content_sha256\":\"6894a8d30edd9f19c8bb6f4a782a2a3330af20d5a6f9a9a6368fc00f137716da\",\"file_bytes\":1323,\"body_bytes\":243},{\"atom_id\":\"system-design-estimate\",\"file_sha256\":\"c3c31dbc2cb75d3e24d97f4a6f6e7b0e55df5c97ab6aa6cad8f0a952874ee50d\",\"content_sha256\":\"104e307f938a7817ebe15572320421e88afdc649e3dd9b6cdde424b69ee71c6d\",\"file_bytes\":1455,\"body_bytes\":288},{\"atom_id\":\"system-design-four-step-process\",\"file_sha256\":\"7bd334835778797ca4683091747c84a27285e47613f8e8c2e45c35b761f56381\",\"content_sha256\":\"e4a8620a1d1ca4191d2dc1493b21563db8dc727762d3846b6b6523e0f724c727\",\"file_bytes\":1477,\"body_bytes\":333},{\"atom_id\":\"system-design-known-patterns\",\"file_sha256\":\"7d8d9b48da7dfcba0bf6a8f5b9c0dd88dfd2deb9da4eaab54ce2338ecbe7a372\",\"content_sha256\":\"520da615f748655fbcbccb6b361c29f20bf2f02c083e5d62ade7b39bcd27999e\",\"file_bytes\":1532,\"body_bytes\":372},{\"atom_id\":\"system-design-operations\",\"file_sha256\":\"c8b0c8e0290d1361c053a87857b83a5bf8944ea8717c9e0b0399964e28d8fd8b\",\"content_sha256\":\"24eaaae2e7e984eb149b4a90abfb250f93def399dc6508b4ab2924c674a71411\",\"file_bytes\":1502,\"body_bytes\":324}]"
carrier_sha256: 75432b1eacddd20a2f03cbf8051af01e8eb5fd262933386e0551f4904d1c84b7
carrier_bytes: 12675
revision: 1
status: active
---
<!-- vpmodule:atom:begin system-design-building-blocks -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-building-blocks
title: Introduce building blocks only for their bottleneck
summary: "Use standard blocks with known tradeoffs, and add a block only when its specific bottleneck appears rather than multiplying failure modes upfront."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Selecting load balancers, caches, queues, hashing or other system blocks."
conditions_does_not_apply_when: A block required by an external contract or platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each introduced block addresses a named bottleneck and its failure modes are stated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L73-L96"
status: active
revision: 1
---

# Introduce building blocks only for their bottleneck

Use standard system building blocks while recognizing each block's tradeoff; introduce a block only when its specific bottleneck appears, since adding all blocks upfront multiplies failure modes. The section describes load balancing, caches, queues and consistent hashing, among others.
<!-- vpmodule:atom:end system-design-building-blocks -->
<!-- vpmodule:atom:begin system-design-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-common-mistakes
title: Avoid common system-design mistakes
summary: "Avoid designing before requirements, omitted estimates, single points of failure, premature sharding, cache without invalidation, synchronous calls everywhere, ignored hotspots and absent monitoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a system design for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L170-L182"
status: active
revision: 1
---

# Avoid common system-design mistakes

Avoid designing before requirements, omitting estimation, single points of failure, premature sharding, caching without invalidation, synchronous calls on every path, ignored hotspots, and absent monitoring; apply the corrective practice listed for each mistake.
<!-- vpmodule:atom:end system-design-common-mistakes -->
<!-- vpmodule:atom:begin system-design-database-scaling -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-database-scaling
title: Scale the database from its access pattern
summary: "Choose SQL or NoSQL from data shape and access, scale vertically first, then replicate or shard according to read/write patterns and tradeoffs."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Choosing a database or scaling one beyond a single node.
conditions_does_not_apply_when: A database fixed by an external platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The database and scaling choice match the data shape and access pattern, with denormalization justified by read dominance."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L97-L120"
status: active
revision: 1
---

# Scale the database from its access pattern

Choose SQL or NoSQL based on data shape and access patterns. Scale vertically first, then use replication or sharding when vertical limits are reached; choose the replication and shard strategy according to read/write patterns and tradeoffs. Denormalize when reads dominate and data changes rarely.
<!-- vpmodule:atom:end system-design-database-scaling -->
<!-- vpmodule:atom:begin system-design-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-diagnostic
title: Run the system-design diagnostic
summary: "Check requirements, QPS and storage estimates, redundancy, database scaling, caching, queues, monitoring and deployment."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a system design.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L183-L195"
status: active
revision: 1
---

# Run the system-design diagnostic

Use the diagnostic questions to check requirements, QPS/storage estimates, redundancy, database scaling, caching, queues, monitoring and deployment; apply the matching action when a question's answer is no.
<!-- vpmodule:atom:end system-design-diagnostic -->
<!-- vpmodule:atom:begin system-design-estimate -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-estimate
title: Estimate capacity before committing
summary: "Estimate QPS, storage, bandwidth and server count with powers of two, latency values and simple arithmetic, and round for order of magnitude."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Choosing an architecture whose capacity or cost matters.
conditions_does_not_apply_when: A design whose capacity is fixed by an external contract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The estimate states its assumptions and gives order-of-magnitude QPS, storage, bandwidth and server counts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L49-L72"
status: active
revision: 1
---

# Estimate capacity before committing

Before committing to an architecture, estimate QPS, storage, bandwidth and server count using powers of two, latency values and simple arithmetic. Use the given formulas and round aggressively for order-of-magnitude estimates rather than precision.
<!-- vpmodule:atom:end system-design-estimate -->
<!-- vpmodule:atom:begin system-design-four-step-process -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-four-step-process
title: Use the four-step system-design process
summary: "Establish scope, propose a high-level design, examine the hardest components, then review tradeoffs and future improvements."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Running a system-design discussion or producing a design.
conditions_does_not_apply_when: A narrow change that does not need a system-level design.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Scope and assumptions are explicitly agreed before components and tradeoffs are examined.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L26-L48"
status: active
revision: 1
---

# Use the four-step system-design process

Use four stages: understand the problem and establish scope; propose a high-level design and get buy-in; examine the hardest or most critical components; then review tradeoffs and future improvements. Do not skip scope and requirements clarification; get explicit agreement on assumptions.
<!-- vpmodule:atom:end system-design-four-step-process -->
<!-- vpmodule:atom:begin system-design-known-patterns -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-known-patterns
title: Adapt known system-design patterns
summary: "Use URL shortener, rate limiter, feed, chat, autocomplete, crawler and unique-ID patterns as starting points, adapting their stated choices."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a system that matches a known pattern.
conditions_does_not_apply_when: A problem with no matching pattern or a pattern that would distort the requirements.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The chosen pattern is adapted to the actual requirements rather than copied wholesale.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L121-L145"
status: active
revision: 1
---

# Adapt known system-design patterns

Use the section's known design patterns as starting points and adapt them to the problem: URL shorteners, rate limiters, feeds, chat, autocomplete, crawlers and unique IDs. Examples specify choices such as redirect behavior, limiter algorithms, feed fanout, WebSockets and queue-backed delivery, crawler politeness and ID generation.
<!-- vpmodule:atom:end system-design-known-patterns -->
<!-- vpmodule:atom:begin system-design-operations -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-operations
title: Treat operations and recovery as design concerns
summary: "Design health checks, monitoring, logging, deployment, disaster recovery and redundancy with explicit recovery objectives and autoscaling bounds."
capability_tags:
  - design-structure
pattern_tags:
  - operational-telemetry
conditions_applies_when: Designing the operational side of a production system.
conditions_does_not_apply_when: A prototype that will not be operated.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design states recovery objectives, deployment and multi-datacenter choices, and minimum and maximum autoscaling counts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L146-L169"
status: active
revision: 1
---

# Treat operations and recovery as design concerns

Treat health checks, monitoring, logging, deployment, disaster recovery and redundancy as first-class design concerns. Define recovery objectives, select deployment and multi-datacenter strategies with their tradeoffs, and set both minimum and maximum autoscaling counts.
<!-- vpmodule:atom:end system-design-operations -->