---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-ai-integration-phase-md-edc361eb-c01"
title: "gsd-core: gsd-core/workflows/ai-integration-phase.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/ai-integration-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/ai-integration-phase.md\"}"
atom_ids:
  - edit-a-shared-file-never-replace-it-whole
  - keep-the-existing-record-as-the-default
  - lock-four-decisions-before-the-planner-starts
atom_count: 3
atoms: "[{\"atom_id\":\"edit-a-shared-file-never-replace-it-whole\",\"file_sha256\":\"f94cccbeab1e503603a85d7c5bfc9f236051a5753b0d60bcb8adf07cd055aab6\",\"content_sha256\":\"135a4295803cc0bbc3fc172176f2ef747c04c75af5b8137404e9da283189ce1e\",\"file_bytes\":1375,\"body_bytes\":235},{\"atom_id\":\"keep-the-existing-record-as-the-default\",\"file_sha256\":\"ef27eecb6bfaff6b4d4f6cbc081e15e730e31e00a8ffbf6e5c65851fbff693cd\",\"content_sha256\":\"e51d3dc86ed79f28a44fba06aec2542aafb3dd9966beaa945bae17bb6afe988e\",\"file_bytes\":1408,\"body_bytes\":276},{\"atom_id\":\"lock-four-decisions-before-the-planner-starts\",\"file_sha256\":\"32ef6832f7329f9b6e61a0439311e979077c8266f1791bf272eaa19c03bfed9c\",\"content_sha256\":\"669ceeac29ff276faf9e71c17be304dfa0f94836a60052aa36ac45fecda26dd4\",\"file_bytes\":1803,\"body_bytes\":554}]"
carrier_sha256: 868e2fcac2ebcf01533f3951e09d6671a27fbb9333a8a21bfb64d55650d3f883
carrier_bytes: 5009
revision: 1
status: active
---
<!-- vpmodule:atom:begin edit-a-shared-file-never-replace-it-whole -->
---
instruction_id: edit-a-shared-file-never-replace-it-whole
title: "Edit a shared file, never replace it whole"
summary: "A file that other workers also write is edited section by section, never written as a whole, and the section is checked to be untouched before the edit lands."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A file is written that another worker may also write.
conditions_does_not_apply_when: The file belongs to one writer only.
artifact_contract_output_type: shared-file-edit
artifact_contract_required_data:
  - the section written
  - the check that it was still a placeholder
artifact_contract_verified_by: no whole-file write reached the shared file and the section was still free before the edit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Edit a shared file, never replace it whole
Write replaces the entire file and will overwrite work from parallel or sequential sibling agents.
Before editing, verify the section you are about to write is still a template placeholder.
<!-- vpmodule:atom:end edit-a-shared-file-never-replace-it-whole -->
<!-- vpmodule:atom:begin keep-the-existing-record-as-the-default -->
---
instruction_id: keep-the-existing-record-as-the-default
title: Keep the existing record as the default
summary: "When a record already exists, keeping it is the default because regenerating it can rewrite a decision a person already made while nobody is there to notice."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A record already exists and the workflow could regenerate it.
conditions_does_not_apply_when: No record exists yet.
artifact_contract_output_type: existing-record-decision
artifact_contract_required_data:
  - the existing record
  - the default taken
  - the reason the default is the non-destructive one
artifact_contract_verified_by: the existing record was kept unless a person asked for it to be rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the existing record as the default
Skip is the auto choice because it is the only non-destructive one: "Update" re-runs framework selection with the existing spec as baseline, which can rewrite decisions a person already recorded in it, and nobody is present to notice
<!-- vpmodule:atom:end keep-the-existing-record-as-the-default -->
<!-- vpmodule:atom:begin lock-four-decisions-before-the-planner-starts -->
---
instruction_id: lock-four-decisions-before-the-planner-starts
title: Lock four decisions before the planner starts
summary: "The framework choice with its alternative, the implementation guidance, the domain context and the evaluation strategy are fixed before a plan is written, so the wrong framework and a late evaluation cannot happen."
capability_tags:
  - plan-implementation
pattern_tags:
  - specification-gate
conditions_applies_when: A plan is about to be written for work that builds an AI system.
conditions_does_not_apply_when: The four decisions are already locked in the plan.
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the framework and its alternative
  - the implementation guidance
  - the domain context
  - the evaluation strategy
artifact_contract_verified_by: all four decisions are written before the planner creates tasks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Lock four decisions before the planner starts
Locks four things before the planner creates tasks:
Framework selection (with rationale and alternatives)
Implementation guidance (correct syntax, patterns, pitfalls from official docs)
Domain context (practitioner rubric ingredients, failure modes, regulatory constraints)
Evaluation strategy (dimensions, rubrics, tooling, reference dataset, guardrails)
This prevents the two most common AI development failures: choosing the wrong framework for the use case, and treating evaluation as an afterthought.
<!-- vpmodule:atom:end lock-four-decisions-before-the-planner-starts -->