---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-integration-checker-compact-md-e3c37115-c01"
title: "gsd-core: agents/gsd-integration-checker.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-integration-checker.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-integration-checker.compact.md\"}"
atom_ids:
  - check-the-connection-not-the-existence
  - map-every-requirement-to-its-cross-phase-path
  - trace-the-whole-chain-and-name-the-break
atom_count: 3
atoms: "[{\"atom_id\":\"check-the-connection-not-the-existence\",\"file_sha256\":\"5c506f4fa34d8801f165226385ec87f726cdd096f22a38d7d5f5453b8600833d\",\"content_sha256\":\"f8c37d40b1b11c2eeccfe8f7198200a86e2fe492b1892285f01f58ade0c8a00f\",\"file_bytes\":1459,\"body_bytes\":329},{\"atom_id\":\"map-every-requirement-to-its-cross-phase-path\",\"file_sha256\":\"fc9c8a687df59373b167652f720f5dc2826280429612630adf06a314aff65ab3\",\"content_sha256\":\"a8d167e2482843f7664faa2a683bacdd0d22b6691e689f178e0221763476f677\",\"file_bytes\":1443,\"body_bytes\":260},{\"atom_id\":\"trace-the-whole-chain-and-name-the-break\",\"file_sha256\":\"7d921dbf4b705d53279550ce5ed8ba6d6e4b509a07694698f0cd45dad5a756d2\",\"content_sha256\":\"4171491285a3c04cd7a61f0ced1b61730de37ceb36f18136e15c3e9548d07f46\",\"file_bytes\":1528,\"body_bytes\":388}]"
carrier_sha256: 727bb4ab471153ee99b36919447eb6b1c69ecb9d10536c58ceaaeb0f0904c6d3
carrier_bytes: 4849
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-connection-not-the-existence -->
---
instruction_id: check-the-connection-not-the-existence
title: "Check the connection, not the existence"
summary: "A part that exists but is never called is a broken part; the check looks for the link, not for the file."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Parts produced by separate pieces of work are audited together.
conditions_does_not_apply_when: A single piece of work is audited on its own.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the connections checked
artifact_contract_verified_by: the report is about connections and not about the presence of files
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Check the connection, not the existence
Existence ≠ Integration
Check connections, not existence. Files existing is phase-level. Files connecting is integration-level.
A "complete" codebase with broken wiring is a broken product.
Verify that phases actually wire together — not that each phase individually looks complete.
<!-- vpmodule:atom:end check-the-connection-not-the-existence -->
<!-- vpmodule:atom:begin map-every-requirement-to-its-cross-phase-path -->
---
instruction_id: map-every-requirement-to-its-cross-phase-path
title: Map every requirement to its cross-phase path
summary: "Each requirement is traced through the parts that carry it, and a requirement that never leaves one part is called out."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: Requirements and the parts that implement them are audited together.
conditions_does_not_apply_when: There is only one part.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the requirement
  - its path
  - its status
artifact_contract_verified_by: every requirement has a wiring status and the unwired ones are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Map every requirement to its cross-phase path
MUST map each integration finding to affected requirement IDs where applicable
Requirements with no cross-phase wiring MUST be flagged in the Requirements Integration Map
Requirements with no cross-phase wiring:
<!-- vpmodule:atom:end map-every-requirement-to-its-cross-phase-path -->
<!-- vpmodule:atom:begin trace-the-whole-chain-and-name-the-break -->
---
instruction_id: trace-the-whole-chain-and-name-the-break
title: Trace the whole chain and name the break
summary: "The path is traced from one end to the other, in both directions, and the break is named with a file and a line."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A user flow crosses several parts of the system.
conditions_does_not_apply_when: The flow lives inside one component.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the chain
  - the break point
artifact_contract_verified_by: the break is named with a file and a line and the whole chain was traced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-integration-checker.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Trace the whole chain and name the break
Trace full paths. Component → API → DB → Response → Display. Break at any point = broken flow.
Check both directions. Export exists AND import exists AND import is used AND used correctly.
Be specific about breaks. "Dashboard doesn't work" is useless. "Dashboard.tsx line 45 fetches /api/users but doesn't await response" is actionable.
<!-- vpmodule:atom:end trace-the-whole-chain-and-name-the-break -->