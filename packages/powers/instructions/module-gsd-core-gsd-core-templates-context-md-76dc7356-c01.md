---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-context-md-76dc7356-c01"
title: "gsd-core: gsd-core/templates/context.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/context.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/context.md\"}"
atom_ids:
  - let-the-sections-emerge-from-the-discussion
  - list-the-canonical-references-with-full-paths-in-a-dedicated-section
atom_count: 2
atoms: "[{\"atom_id\":\"let-the-sections-emerge-from-the-discussion\",\"file_sha256\":\"05e73ba04d3d08ad52ba5a3f34bc0bbdd5936f017f937aedc5a015eadf31f070\",\"content_sha256\":\"695a230d74c62fc54c7b21bfe1e94a0a6f5a484fb06f0015f4e2a694fb2e0133\",\"file_bytes\":1299,\"body_bytes\":233},{\"atom_id\":\"list-the-canonical-references-with-full-paths-in-a-dedicated-section\",\"file_sha256\":\"517b70c4f766654913e8b7b31dc0a1f4e039b67260af951c7924ceb25449347d\",\"content_sha256\":\"1b8ee4fb8f4934c0a1438d28fbb7dd987783be810ea6d689ae41bb3cb4ebbea0\",\"file_bytes\":1563,\"body_bytes\":447}]"
carrier_sha256: 00d183a227d01adbdd4c0837cefe960990615af6db6668a3b198c07318947644
carrier_bytes: 3199
revision: 1
status: active
---
<!-- vpmodule:atom:begin let-the-sections-emerge-from-the-discussion -->
---
instruction_id: let-the-sections-emerge-from-the-discussion
title: Let the sections emerge from the discussion
summary: The sections of the decision document are not predefined; they are the ones the discussion actually produced.
capability_tags:
  - clarify-requirements
pattern_tags:
  - output-formatting
conditions_applies_when: A decision document for a piece of work is written.
conditions_does_not_apply_when: The document has a fixed set of sections from a template.
artifact_contract_output_type: decision-document-sections
artifact_contract_required_data:
  - the sections that were discussed
  - the decision recorded under each
artifact_contract_verified_by: every section corresponds to something the discussion covered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Let the sections emerge from the discussion
**Key principle:** Categories are NOT predefined. They emerge from what was actually discussed for THIS phase. A CLI phase has CLI-relevant sections, a UI phase has UI-relevant sections.
<!-- vpmodule:atom:end let-the-sections-emerge-from-the-discussion -->
<!-- vpmodule:atom:begin list-the-canonical-references-with-full-paths-in-a-dedicated-section -->
---
instruction_id: list-the-canonical-references-with-full-paths-in-a-dedicated-section
title: List the canonical references with full paths in a dedicated section
summary: The documents that define the requirements are listed with their full paths in one section that every later step reads.
capability_tags:
  - clarify-requirements
pattern_tags:
  - source-hierarchy
conditions_applies_when: The decision document is written.
conditions_does_not_apply_when: The project has no external specifications.
artifact_contract_output_type: canonical-references
artifact_contract_required_data:
  - each document with its full path
  - what it decides
artifact_contract_verified_by: "the section exists with full paths, or it says explicitly that there are no external specifications"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# List the canonical references with full paths in a dedicated section
**CRITICAL — Canonical references:** - The `<canonical_refs>` section is MANDATORY. Every CONTEXT.md must have one.
Inline mentions like "see ADR-019" scattered in decisions are useless to downstream agents — they need full paths and section references in a dedicated section they can find
If no external specs exist, say so explicitly — don't silently omit the section
<!-- vpmodule:atom:end list-the-canonical-references-with-full-paths-in-a-dedicated-section -->