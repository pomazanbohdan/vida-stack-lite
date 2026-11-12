---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-add-or-update-a-host-integration-md-4f32097e-c01"
title: "gsd-core: docs/how-to/add-or-update-a-host-integration.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/add-or-update-a-host-integration.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/add-or-update-a-host-integration.md\"}"
atom_ids:
  - change-the-source-not-the-installed-copy
  - degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one
atom_count: 2
atoms: "[{\"atom_id\":\"change-the-source-not-the-installed-copy\",\"file_sha256\":\"beb54e560a6ce6a8fca7697ce4d0ca9bc3a7b269d4746504b224f3ee0aed817f\",\"content_sha256\":\"05b6e38fee7ab7cdf57f241eb4feb354841831b3c9e59b2810d56656c64d61f8\",\"file_bytes\":2179,\"body_bytes\":715},{\"atom_id\":\"degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one\",\"file_sha256\":\"0397c195c1a4ab571caec2863b54438cbf36096a203e10eceb56b5585183bbe5\",\"content_sha256\":\"1b14ac39d37d17bcd6db78b736989ef092ef517cb982758d9e7a55febc611148\",\"file_bytes\":1421,\"body_bytes\":247}]"
carrier_sha256: a321d3bd4d66f43c8d3ccd3695a6163b2191491231e139b10e4561948bce1eb7
carrier_bytes: 3927
revision: 1
status: active
---
<!-- vpmodule:atom:begin change-the-source-not-the-installed-copy -->
---
instruction_id: change-the-source-not-the-installed-copy
title: "Change the source, not the installed copy"
summary: "A change written into an installed copy is overwritten by the next update, so the change belongs in the source repository; to extend a shared method inside a project, make your own module with your own prefix."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A change to a shared artifact is being made in a project that installs it.
conditions_does_not_apply_when: The artifact is your own and has no upstream.
artifact_contract_output_type: change-plan
artifact_contract_required_data:
  - the source repository
  - the installed copy
  - the own module that carries the change
artifact_contract_verified_by: the change survives the next update of the installed artifact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/how-to-add-to-module.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/add-or-update-a-host-integration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Change the source, not the installed copy
a skill written into the installed copy is overwritten by the next update, so build it in the source repository
Do not add to the installed method record; the next update overwrites it.
Make your own module with your own prefix
whose skills require or recommend the method skills they build on
Every path you write into the plan:
must name git-tracked source, never a gitignored install/runtime mirror
executor edits to a mirror die on the next capability sync.
Re-verify inherited paths: fix a mirror path, never inherit.
If a runtime installs somewhere the descriptor cannot express, fix the descriptor; do not edit the snippet by hand — the next sync overwrites it.
<!-- vpmodule:atom:end change-the-source-not-the-installed-copy -->
<!-- vpmodule:atom:begin degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one -->
---
instruction_id: degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one
title: "Degrade to the most restrictive known value, never to a guessed one"
summary: An undeclared capability degrades to the most restrictive value the system already knows; it is never filled with a plausible default.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability value could not be determined from an authoritative source.
conditions_does_not_apply_when: The value was determined.
artifact_contract_output_type: degraded-capability
artifact_contract_required_data:
  - the value that was not determined
  - the restrictive value used instead
artifact_contract_verified_by: the degraded value is the most restrictive known one and no value was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/add-or-update-a-host-integration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade to the most restrictive known value, never to a guessed one
it validates, but `negotiateHostCapabilities` **fail-closes** on it (degrades to the most restrictive known value) — so it is always safe and never a silent capability claim.
<!-- vpmodule:atom:end degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one -->