---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-phase-steps-prd-express-path-md-b0c2af1f-c01"
title: "gsd-core: gsd-core/workflows/plan-phase/steps/prd-express-path.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/plan-phase/steps/prd-express-path.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-phase/steps/prd-express-path.md\"}"
atom_ids:
  - lock-every-requirement-from-the-source-and-name-the-gaps
  - name-the-canonical-sources-the-consumers-must-read
atom_count: 2
atoms: "[{\"atom_id\":\"lock-every-requirement-from-the-source-and-name-the-gaps\",\"file_sha256\":\"cfdd9daa6bd9c0e47dad331f64a1048e0d5f1ea2ab8a90c1608654ca11b48094\",\"content_sha256\":\"c7375a84051cb9a061b22b2913400a0cf5cbb8bfab9959f95ed530b104393070\",\"file_bytes\":1425,\"body_bytes\":288},{\"atom_id\":\"name-the-canonical-sources-the-consumers-must-read\",\"file_sha256\":\"8a73ce6783da23d2f7c1ed6b600c816a3cfd2e533eef5772b73b6f6f32304111\",\"content_sha256\":\"70f80bd0ca93771936dceaa286ec6056d507fdc453eb7a39c34fe53d5bd3ecaf\",\"file_bytes\":1426,\"body_bytes\":285}]"
carrier_sha256: 44edd186315f9c4e30ea8275a5104b7834d84cb0e5538b4d77d99f3578574813
carrier_bytes: 3178
revision: 1
status: active
---
<!-- vpmodule:atom:begin lock-every-requirement-from-the-source-and-name-the-gaps -->
---
instruction_id: lock-every-requirement-from-the-source-and-name-the-gaps
title: Lock every requirement from the source and name the gaps
summary: Every requirement of the source becomes a locked decision and every area the source does not cover is named as discretion.
capability_tags:
  - curate-context
pattern_tags:
  - frozen-intent
conditions_applies_when: A source document is turned into the context the work is planned from.
conditions_does_not_apply_when: The source carries no requirements.
artifact_contract_output_type: locked-decision-context
artifact_contract_required_data:
  - each requirement as a locked decision
  - the areas left to discretion
artifact_contract_verified_by: every requirement of the source is locked and no uncovered area is silently invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/prd-express-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Lock every requirement from the source and name the gaps
Extract all requirements, user stories, acceptance criteria, and constraints from the PRD
Map each to a locked decision (everything in the PRD is treated as a locked decision)
Identify any areas the PRD doesn't cover and mark as
<!-- vpmodule:atom:end lock-every-requirement-from-the-source-and-name-the-gaps -->
<!-- vpmodule:atom:begin name-the-canonical-sources-the-consumers-must-read -->
---
instruction_id: name-the-canonical-sources-the-consumers-must-read
title: Name the canonical sources the consumers must read
summary: "The context names the documents every later agent has to read, with full paths, and says so when there are none."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The context is handed to the agents that will work from it.
conditions_does_not_apply_when: No external document is referenced.
artifact_contract_output_type: canonical-reference-list
artifact_contract_required_data:
  - each referenced document with its full path
  - what it decides
  - the statement that there are none
artifact_contract_verified_by: every referenced document carries a full path and the empty case is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/prd-express-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Name the canonical sources the consumers must read
Downstream agents MUST read these before planning or implementing.
plus any specs/ADRs referenced in the PRD — expand to full file paths
If no external specs: "No external specs — requirements fully captured in decisions above"
<!-- vpmodule:atom:end name-the-canonical-sources-the-consumers-must-read -->