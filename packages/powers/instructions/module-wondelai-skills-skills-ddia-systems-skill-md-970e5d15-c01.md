---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ddia-systems-skill-md-970e5d15-c01"
title: "wondelai-skills: skills/ddia-systems/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/ddia-systems/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ddia-systems/SKILL.md\"}"
atom_ids:
  - ddia-choose-data-model
  - ddia-choose-partitioning
  - ddia-choose-replication
  - ddia-choose-storage-engine
  - ddia-common-mistakes
  - ddia-data-outlives-code
  - ddia-design-for-faults
  - ddia-diagnostic
atom_count: 8
atoms: "[{\"atom_id\":\"ddia-choose-data-model\",\"file_sha256\":\"6f94eaba08f1a5348b94d685933ec45b4bd13b6291f67aa885988410ec26b3ed\",\"content_sha256\":\"fa525edc4b017a382a1e47277f94f3a848d39f15c54d2f8c71b15eb3f004bfec\",\"file_bytes\":1566,\"body_bytes\":365},{\"atom_id\":\"ddia-choose-partitioning\",\"file_sha256\":\"bbf9ce34dd9489f4fc2a660e851905b5eb1fb02567f46284ab158152d326bb0c\",\"content_sha256\":\"8b3e7280e6403a63601aee8558739874c30b5c000b564d42c7f88fb5d621a270\",\"file_bytes\":1415,\"body_bytes\":303},{\"atom_id\":\"ddia-choose-replication\",\"file_sha256\":\"a5c3646e7ffed270d839848fb11ac35385b772a2877ec2cd8bedbaacc01cbf7d\",\"content_sha256\":\"c762781f740c6a28e9a72d353413d18926a463c8b91715408af811696258ce2a\",\"file_bytes\":1512,\"body_bytes\":340},{\"atom_id\":\"ddia-choose-storage-engine\",\"file_sha256\":\"2e01541a91d75a6ee41362ce62ec8d5cf3c5b45a08afb23c867e17a696ed0a3a\",\"content_sha256\":\"83b6145628dc8e2d38cbee433640381b9dc91de058a323ca3f3735e35faf79f1\",\"file_bytes\":1501,\"body_bytes\":347},{\"atom_id\":\"ddia-common-mistakes\",\"file_sha256\":\"89e963a0f187379ec77f6ec7f3380305c42a0732b153bb4fd735af1cf43a57f7\",\"content_sha256\":\"97b14ba806e9ee670627ca376f387e307dcfc955c91aac50fde59139c123f014\",\"file_bytes\":1486,\"body_bytes\":325},{\"atom_id\":\"ddia-data-outlives-code\",\"file_sha256\":\"b8c639ba30ade47b12866bb421e2ac0c0db2f9572ed4004ce457cfe36175a545\",\"content_sha256\":\"2a3c556b2319c0a8d9013506835a10ee234645c514ba60b4674a83a03f826fa5\",\"file_bytes\":1467,\"body_bytes\":250},{\"atom_id\":\"ddia-design-for-faults\",\"file_sha256\":\"2c3f6bc9cafbe00c1cac4e06688f8a07127849ea94cdf7d93c4b820f7969f577\",\"content_sha256\":\"caeb92d29fb028f09a514ee25c6898b6d961d8b180db30eeb012aa6303a41df1\",\"file_bytes\":1517,\"body_bytes\":317},{\"atom_id\":\"ddia-diagnostic\",\"file_sha256\":\"0186ab02cac72b27bfa3c3849550ca564c09bdc361bf437e1f16e82ebfb96256\",\"content_sha256\":\"e8a9b0a4814a64e6d448ea0369cd88a83e1d1d87bee4c5ae3690fba49a6dfe66\",\"file_bytes\":1340,\"body_bytes\":232}]"
carrier_sha256: 4ddc847227a21304b915d32528d95f31a9bd6e9b19e8e98054fc9fa86668af75
carrier_bytes: 12617
revision: 1
status: active
---
<!-- vpmodule:atom:begin ddia-choose-data-model -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-data-model
title: Choose the data model from relationships and queries
summary: "Match relational, document or graph models to relationships and query patterns; account for schema timing, polyglot persistence and impedance mismatch."
capability_tags:
  - design-structure
pattern_tags:
  - query-plan-discipline
conditions_applies_when: Choosing a data model or schema for an application.
conditions_does_not_apply_when: A model fixed by an external contract that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The chosen model matches the actual relationships and query patterns, with schema-on-write versus schema-on-read costs stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L32-L53"
status: active
revision: 1
---

# Choose the data model from relationships and queries

Choose data models according to relationships and query patterns: relational models suit many-to-many and ad hoc queries, documents suit one-to-many and locality, and graphs suit recursive relationship traversal. Account for schema-on-write versus schema-on-read, polyglot persistence and impedance mismatch.
<!-- vpmodule:atom:end ddia-choose-data-model -->
<!-- vpmodule:atom:begin ddia-choose-partitioning -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-partitioning
title: Choose partitioning by access pattern
summary: "Balance key-range and hash partitioning against range scans, hotspots, secondary-index costs and rebalancing."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Sharding data or diagnosing hot partitions.
conditions_does_not_apply_when: Data that fits on one node and has no partitioning decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The partitioning choice matches the access pattern and states its hotspot, index and rebalancing costs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L99-L119"
status: active
revision: 1
---

# Choose partitioning by access pattern

Select partitioning by access pattern: key ranges preserve range scans but can create sequential-key hotspots; hashing distributes load but loses sort order. Account for local-index scatter-gather, global-index cross-partition updates, hot keys and rebalancing.
<!-- vpmodule:atom:end ddia-choose-partitioning -->
<!-- vpmodule:atom:begin ddia-choose-replication -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-replication
title: Choose replication with explicit trade-offs
summary: "State consistency, availability and latency trade-offs; account for leader bottlenecks, conflict resolution, lag anomalies and failover loss."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: "Designing replication for fault tolerance, scalability or latency reduction."
conditions_does_not_apply_when: A single-node deployment with no replication decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The replication design states its consistency, availability, latency and failover-loss trade-offs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L75-L98"
status: active
revision: 1
---

# Choose replication with explicit trade-offs

Choose replication strategy with explicit consistency, availability and latency trade-offs. Account for leader bottlenecks, conflict resolution, replication-lag anomalies, synchronous durability costs, asynchronous failover loss, and the correctness guarantees of conflict-resolution methods.
<!-- vpmodule:atom:end ddia-choose-replication -->
<!-- vpmodule:atom:begin ddia-choose-storage-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-storage-engine
title: Choose the storage engine from workload trade-offs
summary: "Match LSM trees, B-trees, column stores or in-memory stores to read and write amplification, analytics and SSD durability costs."
capability_tags:
  - improve-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: Selecting a storage engine or index for a known workload.
conditions_does_not_apply_when: A storage engine fixed by the deployment platform.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The choice names the dominant read/write pattern and the amplification or SSD-write cost it accepts.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L54-L74"
status: active
revision: 1
---

# Choose the storage engine from workload trade-offs

Choose storage engines according to workload trade-offs: LSM trees favor write throughput with read amplification, B-trees balance reads and writes with write amplification, and column stores support analytics. Consider SSD write cycles and the encoding overhead avoided by in-memory systems.
<!-- vpmodule:atom:end ddia-choose-storage-engine -->
<!-- vpmodule:atom:begin ddia-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-common-mistakes
title: Avoid common data-system mistakes
summary: "Avoid popularity-driven database choices, ignored replication lag, indiscriminate distributed transactions, universal hashing, assumed serializability, conflated batch and stream, and undifferentiated faults."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a data-intensive system for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the workload-matched correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L189-L200"
status: active
revision: 1
---

# Avoid common data-system mistakes

Avoid choosing databases by popularity, ignoring replication lag, using distributed transactions indiscriminately, hashing every partition, assuming serializable isolation, confusing batch with stream, or treating all faults as recoverable; apply the listed workload-matched corrections.
<!-- vpmodule:atom:end ddia-common-mistakes -->
<!-- vpmodule:atom:begin ddia-data-outlives-code -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-data-outlives-code
title: Treat data as the durable asset
summary: "Prioritize long-term data correctness, durability and evolvability, and make consistency, availability and latency trade-offs explicit."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Choosing a data store or designing a data-intensive system whose data will outlive the application.
conditions_does_not_apply_when: A disposable dataset whose loss or rewrite has no lasting consequence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design states the data volume, complexity, change rate and explicit consistency, availability and latency trade-offs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat data as the durable asset

Prioritize long-term correctness, durability and evolvability of data because data outlives applications. Identify data volume, complexity, change rate and explicit consistency, availability and latency trade-offs.
<!-- vpmodule:atom:end ddia-data-outlives-code -->
<!-- vpmodule:atom:begin ddia-design-for-faults -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-design-for-faults
title: Design for faults without assuming failure
summary: "Distinguish faults from failures, account for correlated software faults and human error, tune timeouts and preserve safety properties."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: Designing reliability or fault tolerance for a distributed system.
conditions_does_not_apply_when: A component that has no availability or fault-tolerance requirement.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design distinguishes faults from failures, states its fault assumptions and preserves safety properties."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L167-L188"
status: active
revision: 1
---

# Design for faults without assuming failure

Design for faults and preserve correct operation despite component faults. Distinguish faults from system failures, account for correlated software faults and human error, tune timeouts, preserve safety properties, and choose fault assumptions appropriate to the system.
<!-- vpmodule:atom:end ddia-design-for-faults -->
<!-- vpmodule:atom:begin ddia-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-diagnostic
title: Run the DDIA diagnostic
summary: "Check data-model choice, isolation defaults, replication strategy, hot-key handling, source-versus-derived data, timeout and retry tuning, and failover testing."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a data-intensive system.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L201-L212"
status: active
revision: 1
---

# Run the DDIA diagnostic

Use the seven diagnostic questions to check data-model choice, isolation defaults, replication strategy, hot-key handling, separation of source and derived data, timeout/retry tuning and failover testing.
<!-- vpmodule:atom:end ddia-diagnostic -->