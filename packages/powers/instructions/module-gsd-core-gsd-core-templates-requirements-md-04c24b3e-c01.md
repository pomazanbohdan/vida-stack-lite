---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-requirements-md-04c24b3e-c01"
title: "gsd-core: gsd-core/templates/requirements.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/templates/requirements.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/requirements.md\"}"
atom_ids:
  - close-a-requirement-only-when-implemented-verified-and-committed
  - give-each-requirement-an-id-and-a-user-centric-statement
  - map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect
  - write-the-out-of-scope-list-with-its-reasons
atom_count: 4
atoms: "[{\"atom_id\":\"close-a-requirement-only-when-implemented-verified-and-committed\",\"file_sha256\":\"fa5bd0e32661420ef6711075c51ece652913f63b193ea889d860bcdc598b8fac\",\"content_sha256\":\"ee02ca438cdf1a1cfa3b70e3746c05b7b8b409ad9081138c4a2f5e7c19e61661\",\"file_bytes\":1288,\"body_bytes\":208},{\"atom_id\":\"give-each-requirement-an-id-and-a-user-centric-statement\",\"file_sha256\":\"9dc8e15f4f56e2eed0b0ce2267f0af9d757ace23763dda30c8a06c04b6e24016\",\"content_sha256\":\"694257ee0a20850c224d11d2aab8d7938caec4c63b34622a207f1abc385b2275\",\"file_bytes\":1202,\"body_bytes\":166},{\"atom_id\":\"map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect\",\"file_sha256\":\"cbaee80ae7b4b594a3cbb39773a859a39433917c3126648f73d3a1b29a2c1531\",\"content_sha256\":\"07241ec51dd72e74aab10a413525860707889eb75d2cd93175d0afee1419fac1\",\"file_bytes\":1409,\"body_bytes\":234},{\"atom_id\":\"write-the-out-of-scope-list-with-its-reasons\",\"file_sha256\":\"c8adf4904e6fd8d103eca1b9eb88a9f837a49e69daf0a3acee6a0a451379d330\",\"content_sha256\":\"edc89ac26b196a3b8f24e2f92cce650759617dfad51596f30b8bb8ff77a194ba\",\"file_bytes\":1446,\"body_bytes\":313}]"
carrier_sha256: a6e06d75f62209d89cdb8ae7b3ddfc55b359d7055f8fb2960622b91056dec635
carrier_bytes: 6028
revision: 1
status: active
---
<!-- vpmodule:atom:begin close-a-requirement-only-when-implemented-verified-and-committed -->
---
instruction_id: close-a-requirement-only-when-implemented-verified-and-committed
title: "Close a requirement only when it is implemented, verified and committed"
summary: "A requirement is complete only when the feature is implemented, verified and committed."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A requirement is about to be marked as complete.
conditions_does_not_apply_when: The requirement is still in progress.
artifact_contract_output_type: requirement-status
artifact_contract_required_data:
  - the three states that make the requirement complete
artifact_contract_verified_by: the requirement is marked complete only with all three states in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Close a requirement only when it is implemented, verified and committed
Requirement is "Complete" when: - Feature is implemented - Feature is verified (tests pass, manual check done) - Feature is committed
<!-- vpmodule:atom:end close-a-requirement-only-when-implemented-verified-and-committed -->
<!-- vpmodule:atom:begin give-each-requirement-an-id-and-a-user-centric-statement -->
---
instruction_id: give-each-requirement-an-id-and-a-user-centric-statement
title: Give each requirement an id and a user-centric statement
summary: "A requirement carries a category identifier and a statement that is user-centric, testable and atomic."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stable-identity
conditions_applies_when: A requirement is written down.
conditions_does_not_apply_when: The requirement already has its identifier.
artifact_contract_output_type: requirement-entry
artifact_contract_required_data:
  - the identifier
  - the user-centric statement
artifact_contract_verified_by: every requirement carries an identifier and a user-centric testable statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Give each requirement an id and a user-centric statement
- ID: `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02, SOCIAL-03)
- Description: User-centric, testable, atomic
<!-- vpmodule:atom:end give-each-requirement-an-id-and-a-user-centric-statement -->
<!-- vpmodule:atom:begin map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect -->
---
instruction_id: map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect
title: Map every requirement to a phase and treat the gap as a defect
summary: Each requirement maps to exactly one phase and the unmapped count is reported.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The roadmap is checked against the requirement set.
conditions_does_not_apply_when: The roadmap has no requirements to map.
artifact_contract_output_type: traceability-table
artifact_contract_required_data:
  - each requirement with its phase
  - the unmapped count
artifact_contract_verified_by: every requirement maps to exactly one phase and the unmapped count is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body maps generic requirements to roadmap phases without identifying what the requirements or roadmap govern, so no domain is grounded."
---

# Map every requirement to a phase and treat the gap as a defect
Each requirement maps to exactly one phase
Unmapped requirements = roadmap gap
**Coverage:** - v1 requirements: [X] total - Mapped to phases: [Y] - Unmapped: [Z] ⚠️
<!-- vpmodule:atom:end map-every-requirement-to-a-phase-and-treat-the-gap-as-a-defect -->
<!-- vpmodule:atom:begin write-the-out-of-scope-list-with-its-reasons -->
---
instruction_id: write-the-out-of-scope-list-with-its-reasons
title: Write the out-of-scope list with its reasons
summary: "What is excluded is written with the reason, so it is not added back later."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The boundaries of a piece of work are being written.
conditions_does_not_apply_when: The boundaries are already fixed and recorded elsewhere.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - what is out of scope
  - the reason for each exclusion
artifact_contract_verified_by: every exclusion carries a reason and the list is visible to later work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Write the out-of-scope list with its reasons
The out-of-scope list with reasoning is as important as the in-scope list.
Future phases that touch adjacent areas can point to this SPEC.md to understand what was intentionally excluded.
Explicit exclusions with reasoning
Prevents "why didn't you include X?" later
<!-- vpmodule:atom:end write-the-out-of-scope-list-with-its-reasons -->