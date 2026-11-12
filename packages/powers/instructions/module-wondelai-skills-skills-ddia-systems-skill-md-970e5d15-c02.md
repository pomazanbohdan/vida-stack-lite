---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-ddia-systems-skill-md-970e5d15-c02"
title: "wondelai-skills: skills/ddia-systems/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/ddia-systems/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/ddia-systems/SKILL.md\"}"
atom_ids:
  - ddia-score-data-architecture
  - ddia-separate-derived-data
  - ddia-use-transactions-deliberately
atom_count: 3
atoms: "[{\"atom_id\":\"ddia-score-data-architecture\",\"file_sha256\":\"4e163db6507b8d32ab1c6de0d11e2155dc2e16b09ba8ba9ce94d65912305045d\",\"content_sha256\":\"73f95b355b8c794a3d344ca06fd96565e2cb379c82c0c884330b3ae80dd160e9\",\"file_bytes\":1507,\"body_bytes\":272},{\"atom_id\":\"ddia-separate-derived-data\",\"file_sha256\":\"ba520bd9f44302504cf2d4e27bd48e8357be0f620321f95c8e3371b600dbf700\",\"content_sha256\":\"32dae808db8cacc2e0ab64cceda1385feb8a4ce7ede2b6f20f042e957a9a294d\",\"file_bytes\":1522,\"body_bytes\":333},{\"atom_id\":\"ddia-use-transactions-deliberately\",\"file_sha256\":\"9115f4935868198431d4861e253e11d2f5a9e48de55172466af9d9679a3d1c2b\",\"content_sha256\":\"678e43982273b44d00be774b347546dcf74d1b8f8ab9bca1555d283511df52ad\",\"file_bytes\":1589,\"body_bytes\":355}]"
carrier_sha256: 6ac7a94cd02684f5e56d9085b970cd9411254ec7e57a92a2debdec7de254c875
carrier_bytes: 4967
revision: 1
status: active
---
<!-- vpmodule:atom:begin ddia-score-data-architecture -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-score-data-architecture
title: Score a data architecture against the DDIA diagnostic
summary: "Score the seven diagnostic rows, awarding credit only for deliberate documented trade-offs, and report the score, failed rows and improvements."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a data architecture against the seven DDIA diagnostic rows.
conditions_does_not_apply_when: A narrow implementation review that does not assess data-layer choices.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - improvements
artifact_contract_verified_by: "The report states the score, the failed rows and the improvements needed to reach 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score a data architecture against the DDIA diagnostic

Score data architecture against the seven diagnostic rows, awarding credit only when choices have evidence of deliberate documented trade-offs. Report the score, failed rows and improvements using the listed bands.
<!-- vpmodule:atom:end ddia-score-data-architecture -->
<!-- vpmodule:atom:begin ddia-separate-derived-data -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-separate-derived-data
title: Separate the system of record from derived data
summary: "Use batch for bounded data and streams for unbounded events, and make derived data rebuildable with CDC, stream-table duality, idempotence and windowing."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a data pipeline or deriving data from a system of record.
conditions_does_not_apply_when: A one-off report that is not maintained as derived data.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The system of record is distinct from derived data, and derived data can be rebuilt from the source."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L143-L166"
status: active
revision: 1
---

# Separate the system of record from derived data

Use batch processing for bounded datasets and stream processing for unbounded events; separate the system of record from rebuildable derived data. Account for dataflow engines, CDC, stream-table duality, idempotence or transactional output for exactly-once behavior, and windowing.
<!-- vpmodule:atom:end ddia-separate-derived-data -->
<!-- vpmodule:atom:begin ddia-use-transactions-deliberately -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-use-transactions-deliberately
title: Use transactions with the actual isolation level in mind
summary: "Understand the real isolation level and anomalies; account for write skew, SSI aborts, locking contention and distributed-transaction cost."
capability_tags:
  - design-structure
pattern_tags:
  - safe-defaults
conditions_applies_when: Relying on transactions or setting an isolation level.
conditions_does_not_apply_when: A single-statement operation with no concurrency or partial-failure risk.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design names the actual isolation level, the anomalies it permits and the operations that need explicit locking or single-partition scope."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L120-L142"
status: active
revision: 1
---

# Use transactions with the actual isolation level in mind

Use transactions for safety within their scope; understand the actual isolation level and anomalies rather than assuming serializability. Account for write skew, SSI aborts, two-phase-locking contention and the cost of distributed transactions; favor single-partition operations where suitable.
<!-- vpmodule:atom:end ddia-use-transactions-deliberately -->