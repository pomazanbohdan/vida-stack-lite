---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-audit-milestone-md-8f1cf7f1-c01"
title: "gsd-core: gsd-core/workflows/audit-milestone.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/audit-milestone.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/audit-milestone.md\"}"
atom_ids:
  - a-requirement-nobody-verified-is-unsatisfied
  - derive-the-status-of-each-requirement-from-independent-sources
atom_count: 2
atoms: "[{\"atom_id\":\"a-requirement-nobody-verified-is-unsatisfied\",\"file_sha256\":\"391af35d58f193533e27ad12bb4683d1a895862d96cfad1ad748a40dcbad6182\",\"content_sha256\":\"9800f0f26ccb1444c3856cb26bea9feb95fae85e2bafdce0e29969c5f22dc136\",\"file_bytes\":1415,\"body_bytes\":288},{\"atom_id\":\"derive-the-status-of-each-requirement-from-independent-sources\",\"file_sha256\":\"392688c4ad21c105c1394ebbbcbd6456b64a836f5398ffe17bc7384b271d42cb\",\"content_sha256\":\"2d7dbb3afc686e335a94e17242bae0423e7f94ed1809843f755e8c0df8caf89a\",\"file_bytes\":1817,\"body_bytes\":524}]"
carrier_sha256: bffa6abc9211e222df84cd9077100ec04a058a135916207a6820e18accc77643
carrier_bytes: 3559
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-requirement-nobody-verified-is-unsatisfied -->
---
instruction_id: a-requirement-nobody-verified-is-unsatisfied
title: A requirement nobody verified is unsatisfied
summary: "A requirement that was assigned but that no phase verified is flagged as orphaned and treated as unsatisfied, not as merely unproven."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A requirement is assigned but no verification record mentions it.
conditions_does_not_apply_when: At least one verification record covers the requirement.
artifact_contract_output_type: orphan-requirement-report
artifact_contract_required_data:
  - the orphaned requirement
  - the status it is given
artifact_contract_verified_by: the orphaned requirement is reported and counted as unsatisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# A requirement nobody verified is unsatisfied
Requirements present in REQUIREMENTS.md traceability table but absent from ALL phase VERIFICATION.md files MUST be flagged as orphaned.
Orphaned requirements are treated as `unsatisfied` - they were assigned but never verified by any phase.
<!-- vpmodule:atom:end a-requirement-nobody-verified-is-unsatisfied -->
<!-- vpmodule:atom:begin derive-the-status-of-each-requirement-from-independent-sources -->
---
instruction_id: derive-the-status-of-each-requirement-from-independent-sources
title: Derive the status of each requirement from independent sources
summary: "The status of every requirement comes from cross-referencing three independent sources through a fixed matrix, so one source cannot decide the outcome on its own."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: The status of a requirement is decided at the end of a body of work.
conditions_does_not_apply_when: The status has already been decided and recorded.
artifact_contract_output_type: requirement-status-matrix
artifact_contract_required_data:
  - the three sources
  - the status each combination yields
artifact_contract_verified_by: no status was taken from a single source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body maps evidence states to requirement status, while the conditions only say when status is decided; requirement tracking alone does not identify a listed content domain."
---

# Derive the status of each requirement from independent sources
MUST cross-reference three independent sources for each requirement:
For each REQ-ID, determine status using all three sources:
Status matrix:
| passed | listed | `[x]` | **satisfied** |
| passed | listed | `[ ]` | **satisfied** (update checkbox) |
| passed | missing | any | **partial** (verify manually) |
| gaps_found | any | any | **unsatisfied** |
| missing | listed | any | **partial** (verification gap) |
| missing | missing | any | **unsatisfied** |
<!-- vpmodule:atom:end derive-the-status-of-each-requirement-from-independent-sources -->