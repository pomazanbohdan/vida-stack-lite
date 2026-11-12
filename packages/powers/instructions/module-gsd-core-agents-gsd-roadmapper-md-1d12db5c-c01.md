---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-roadmapper-md-1d12db5c-c01"
title: "gsd-core: agents/gsd-roadmapper.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:agents/gsd-roadmapper.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-roadmapper.md\"}"
atom_ids:
  - fold-a-thin-phase-into-its-nearest-neighbour
  - write-both-representations-of-every-phase-not-only-the-summary
atom_count: 2
atoms: "[{\"atom_id\":\"fold-a-thin-phase-into-its-nearest-neighbour\",\"file_sha256\":\"19f91f0bd967906da090f0c428f57cdb6e3b1e591339fcccbfbe8f118884bfe8\",\"content_sha256\":\"23a10bf5ea289e023b33a4017043147a00f8501bcce10b249692bfb13bcd4ed2\",\"file_bytes\":1522,\"body_bytes\":355},{\"atom_id\":\"write-both-representations-of-every-phase-not-only-the-summary\",\"file_sha256\":\"999278f4cbb1fa11e6162411f601f7c95b29a316a397fefe678166a5ef1ac200\",\"content_sha256\":\"d16b0aef81c5f4231f03100358ffeaac77232961ce8ff0b7f441b18c8e643fac\",\"file_bytes\":1506,\"body_bytes\":359}]"
carrier_sha256: 943014eae5288d0aa28f6649d1ae35fbe5db42f111068fcb5b9ecb99bd928b53
carrier_bytes: 3355
revision: 1
status: active
---
<!-- vpmodule:atom:begin fold-a-thin-phase-into-its-nearest-neighbour -->
---
instruction_id: fold-a-thin-phase-into-its-nearest-neighbour
title: Fold a thin phase into its nearest neighbour
summary: "A phase with one requirement, an internal-quality goal, or criteria that read as tasks is folded into the closest related phase instead of standing alone."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A planned item would carry a single requirement or a goal that is not user-observable.
conditions_does_not_apply_when: The item delivers a capability of its own that can be verified on its own.
artifact_contract_output_type: phase-structure
artifact_contract_required_data:
  - the phase the thin item was folded into
  - the reason it was not a phase
artifact_contract_verified_by: no standalone phase carries a single requirement or an internal-quality goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-roadmapper.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Fold a thin phase into its nearest neighbour
When a phase you are about to write would have a single requirement, an internal-quality goal ("improve X", "refactor Y", "add tests for Z"), or success criteria that read as tasks rather than user-observable outcomes, prefer to fold it into the most-related neighbor instead of creating a standalone phase.
<!-- vpmodule:atom:end fold-a-thin-phase-into-its-nearest-neighbour -->
<!-- vpmodule:atom:begin write-both-representations-of-every-phase-not-only-the-summary -->
---
instruction_id: write-both-representations-of-every-phase-not-only-the-summary
title: "Write both representations of every phase, not only the summary"
summary: A phase needs its checklist entry and its detail section; the detail headers are what the downstream lookups parse.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document holds both a summary list and per-item detail sections.
conditions_does_not_apply_when: The document has only one of the two forms by design.
artifact_contract_output_type: document-with-two-forms
artifact_contract_required_data:
  - the summary entry of every item
  - the detail section of every item
artifact_contract_verified_by: every item appears in both forms and the detail form carries the header the tools parse
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-roadmapper.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write both representations of every phase, not only the summary
**CRITICAL: ROADMAP.md requires TWO phase representations. Both are mandatory.**
**The `### Phase X:` headers are parsed by downstream tools.** If you only write the summary checklist, phase lookups will fail. Use the correct form for the configured convention so downstream parsing succeeds.
<!-- vpmodule:atom:end write-both-representations-of-every-phase-not-only-the-summary -->