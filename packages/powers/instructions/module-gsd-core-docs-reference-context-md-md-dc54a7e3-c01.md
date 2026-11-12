---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-context-md-md-dc54a7e3-c01"
title: "gsd-core: docs/reference/context-md.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/reference/context-md.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/context-md.md\"}"
atom_ids:
  - check-that-every-decision-survives-into-the-work
  - put-the-canonical-path-in-the-dedicated-section-not-in-a-mention
atom_count: 2
atoms: "[{\"atom_id\":\"check-that-every-decision-survives-into-the-work\",\"file_sha256\":\"bd7eaceb73d2af4876d8c4ed23b17b0808125a37fc2a9c5e0a5ba72ed8b0a78c\",\"content_sha256\":\"e0b7306002ce648580cdb05e72710ec18dd4314b5fd8164180f0c03deb5fed93\",\"file_bytes\":1437,\"body_bytes\":230},{\"atom_id\":\"put-the-canonical-path-in-the-dedicated-section-not-in-a-mention\",\"file_sha256\":\"b1da1cbb2656c592f819d9702f778dbb58fa9d2bef0a023f1b18d0946ec6a264\",\"content_sha256\":\"e07ee2b1f84dd40ce6977cff748f4433341d2bccbb5f57f2cbf2f4aafa4ada64\",\"file_bytes\":1649,\"body_bytes\":336}]"
carrier_sha256: 7b2f1eb31752b7ef046043931e4c60c3dfdb68814e372d05f46560a65606f583
carrier_bytes: 3425
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-that-every-decision-survives-into-the-work -->
---
instruction_id: check-that-every-decision-survives-into-the-work
title: Check that every decision survives into the work
summary: "Every decision that was recorded is checked against the work that was planned, and nothing that was deferred is implemented; a decision that was dropped is a finding, not a detail."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The planned work is checked against the decisions that were recorded.
conditions_does_not_apply_when: No decisions were recorded for this work.
artifact_contract_output_type: decision-coverage
artifact_contract_required_data:
  - the recorded decisions
  - the work items that cover them
  - the deferred items that must not be implemented
artifact_contract_verified_by: every recorded decision is covered by the work and no deferred item was implemented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/context-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Check that every decision survives into the work
- Every `D-NN` identifier in `<decisions>` must appear in at least one plan task's `<action>` or rationale.
- No task may implement anything listed in `<deferred>` (scope creep).
<!-- vpmodule:atom:end check-that-every-decision-survives-into-the-work -->
<!-- vpmodule:atom:begin put-the-canonical-path-in-the-dedicated-section-not-in-a-mention -->
---
instruction_id: put-the-canonical-path-in-the-dedicated-section-not-in-a-mention
title: "Put the canonical path in the dedicated section, not in a mention"
summary: "The references a later step must read are listed with their full path in the section that exists for them; a scattered mention of a name is not enough, and an absent section is reported as incomplete."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A record of decisions is written and the documents it depends on are named.
conditions_does_not_apply_when: The record has no section for references and none is needed.
artifact_contract_output_type: canonical-reference-section
artifact_contract_required_data:
  - the section that holds the references
  - the full path of each referenced document
  - what happens when the section is absent
artifact_contract_verified_by: every referenced document is named by its full path in the dedicated section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/context-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Put the canonical path in the dedicated section, not in a mention
- The `<canonical_refs>` block is **mandatory**. Agents that find it absent treat the CONTEXT.md as incomplete and surface a warning.
- Inline mentions like "see ADR-019" scattered in `<decisions>` are insufficient; agents need the full path in the dedicated section.
<!-- vpmodule:atom:end put-the-canonical-path-in-the-dedicated-section-not-in-a-mention -->