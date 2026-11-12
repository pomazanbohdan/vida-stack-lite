---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-specless-probe-fallback-md-67d9886c-c01"
title: "gsd-core: gsd-core/references/specless-probe-fallback.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/specless-probe-fallback.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/specless-probe-fallback.md\"}"
atom_ids:
  - give-one-producer-per-section
  - never-drop-a-surfaced-item-silently
atom_count: 2
atoms: "[{\"atom_id\":\"give-one-producer-per-section\",\"file_sha256\":\"ba657efc47ecc6f9ebb96d301f35eb6ea3eb58b473068733d0051b6c1f11d5bc\",\"content_sha256\":\"fca22007cf4d059bb1f96053791860bda8894d26256be07a692d5ef496abfb32\",\"file_bytes\":1094,\"body_bytes\":124},{\"atom_id\":\"never-drop-a-surfaced-item-silently\",\"file_sha256\":\"9f16bc0bc8583b282400210ed1b4401dda71b87a153d26bba77a331165e5dc4e\",\"content_sha256\":\"69c73314a6186655bb1abd2604df6d0c80b9386fb1a7dc0a90413f0316b063c2\",\"file_bytes\":1504,\"body_bytes\":280}]"
carrier_sha256: 167600c19f07c17126e35e0ff68f36c673f784646291e90a60da50557350498c
carrier_bytes: 2841
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-one-producer-per-section -->
---
instruction_id: give-one-producer-per-section
title: Give one producer per section
summary: A section that was supplied is never re-run or overwritten; exactly one producer owns it.
capability_tags:
  - verify-work-results
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A section could be produced by more than one source.
conditions_does_not_apply_when: Exactly one source can produce the section.
artifact_contract_output_type: section-ownership
artifact_contract_required_data:
  - the section
  - its producer
artifact_contract_verified_by: the section was produced once and not overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/specless-probe-fallback.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give one producer per section
a SPEC-supplied section is never re-run or overwritten — exactly one producer per section
<!-- vpmodule:atom:end give-one-producer-per-section -->
<!-- vpmodule:atom:begin never-drop-a-surfaced-item-silently -->
---
instruction_id: never-drop-a-surfaced-item-silently
title: Never drop a surfaced item silently
summary: Every surfaced item is either written into the plan or surfaced as a flagged assumption; none is dismissed on the fly.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A probe or a classification pass has surfaced a set of items.
conditions_does_not_apply_when: Nothing was surfaced.
artifact_contract_output_type: surfaced-item-ledger
artifact_contract_required_data:
  - the surfaced items
  - the ones written into the plan
  - the ones flagged as assumptions
artifact_contract_verified_by: the number surfaced equals the number authored plus the number flagged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/specless-probe-fallback.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/ui-consideration-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - research
---

# Never drop a surfaced item silently
for each section, (# probe-surfaced items) == (# authored into `must_haves` + # surfaced as flagged assumptions)
**Never auto-dismiss** (a wrong dismissal is the exact silent failure this eliminates)
never a silent drop, never a guessed kind
<!-- vpmodule:atom:end never-drop-a-surfaced-item-silently -->