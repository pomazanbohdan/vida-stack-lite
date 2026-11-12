---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-steps-planner-wave-md-2bb624b0-c01"
title: "gsd-core: gsd-core/workflows/quick-batch/steps/planner-wave.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/quick-batch/steps/planner-wave.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch/steps/planner-wave.md\"}"
atom_ids:
  - declare-the-plans-dependencies-files-and-deletions
  - recompute-the-layering-after-every-layer
atom_count: 2
atoms: "[{\"atom_id\":\"declare-the-plans-dependencies-files-and-deletions\",\"file_sha256\":\"2e3208f9a931b36bd83c9ecca679f45149a79a17ce236302c2fcc983e8f39edb\",\"content_sha256\":\"75f556c4308740b56f7a52bb80c5c74faed60cb27fc31cff580c05a1e35d49bb\",\"file_bytes\":1570,\"body_bytes\":379},{\"atom_id\":\"recompute-the-layering-after-every-layer\",\"file_sha256\":\"21cacd2eff3ac255943760dd06399d53777a53adf9ef9664f1100e4664d478cc\",\"content_sha256\":\"229ebbd92f1538f8ce68db48c98f229b8c621196f5f20660ce4a77cbb7b6c4d2\",\"file_bytes\":1533,\"body_bytes\":209}]"
carrier_sha256: 0096add8923fdf9f97ce7e5f94bc06d3e5947adbad7ae18fa7db7fe6c831c2d1
carrier_bytes: 3398
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-the-plans-dependencies-files-and-deletions -->
---
instruction_id: declare-the-plans-dependencies-files-and-deletions
title: "Declare the plan's dependencies, files and deletions"
summary: "A plan declares the units it depends on, the files it will touch and the files it will delete, and a deletion that the plan does not declare blocks the integration."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan is written and will be integrated into a shared branch.
conditions_does_not_apply_when: The plan is executed on its own and never integrated.
artifact_contract_output_type: plan-declaration
artifact_contract_required_data:
  - the dependencies
  - the touched files
  - the declared deletions
artifact_contract_verified_by: the plan names every deletion it performs and the integration accepted it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Declare the plan's dependencies, files and deletions
ALWAYS emit `files_modified` frontmatter (array of repo-relative paths
Reference ONLY quick ids from the catalog above; never invent one, never reference a task from a different batch
If this plan will delete any file, ALSO emit `files_deleted` frontmatter naming exactly those paths
an undeclared deletion blocks the merge
<!-- vpmodule:atom:end declare-the-plans-dependencies-files-and-deletions -->
<!-- vpmodule:atom:begin recompute-the-layering-after-every-layer -->
---
instruction_id: recompute-the-layering-after-every-layer
title: Recompute the layering after every layer
summary: "The work is planned one dependency layer at a time and the layering is recomputed after each layer, so a later layer can differ from the one that was assigned at the start."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Several units are planned and a plan can reveal a dependency between them.
conditions_does_not_apply_when: The units are independent and already ordered.
artifact_contract_output_type: recomputed-layering
artifact_contract_required_data:
  - the layer that was planned
  - the recomputed layering
  - the difference it produced
artifact_contract_verified_by: the layering after the layer differs from the one that was assigned before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The frozen body ends mid-sentence after requiring whole-batch wave recomputation, so its operative form cannot be established without supplying missing text."
---

# Recompute the layering after every layer
Planning proceeds one DAG layer at a time, driven by the CURRENT wave assignment
RECOMPUTES waves for the whole batch
so a later layer can genuinely differ from what
<!-- vpmodule:atom:end recompute-the-layering-after-every-layer -->