---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-phase-steps-chunked-planning-mode-md-73d3b90d-c01"
title: "gsd-core: gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md\"}"
atom_ids:
  - dedupe-the-ids-before-you-dispatch
  - fail-toward-the-safe-default-when-a-flag-is-malformed
atom_count: 2
atoms: "[{\"atom_id\":\"dedupe-the-ids-before-you-dispatch\",\"file_sha256\":\"97cd015a8cc7279034a46eb0df0fe754ede8b68390ec85a4bdb3e21ea8fd8a2b\",\"content_sha256\":\"f905ea7820d65c964503915a3e43829ad3edc5d744eb6052198c21a53a100ef0\",\"file_bytes\":1284,\"body_bytes\":246},{\"atom_id\":\"fail-toward-the-safe-default-when-a-flag-is-malformed\",\"file_sha256\":\"28fb8bd4910096fb5fc10de9709d655d34a30895ec1f797fbdc786de84a6b782\",\"content_sha256\":\"deb3e512861a063e1266345b9a8ab6699df3731a8059eee0ca9d758cc82cbed5\",\"file_bytes\":1586,\"body_bytes\":307}]"
carrier_sha256: e98818e95b93ad9a0295acc9a22c9d55656efea5fc74953055c98344a596dcb2
carrier_bytes: 3159
revision: 1
status: active
---
<!-- vpmodule:atom:begin dedupe-the-ids-before-you-dispatch -->
---
instruction_id: dedupe-the-ids-before-you-dispatch
title: Dedupe the ids before you dispatch
summary: "The list of ids is deduplicated before anything is dispatched, so two runs never target the same output."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A batch of ids is built from a source that may repeat them.
conditions_does_not_apply_when: The ids come from a source that cannot repeat them.
artifact_contract_output_type: dispatch-id-list
artifact_contract_required_data:
  - the deduplicated ids
  - the order they were dispatched in
artifact_contract_verified_by: no id appears twice in the dispatched batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Dedupe the ids before you dispatch
Build the batch's plan-ID list from the outline rows sharing this Wave value, in outline row order, deduplicated defensively
a malformed outline naming the same Plan ID twice must never produce two concurrent
<!-- vpmodule:atom:end dedupe-the-ids-before-you-dispatch -->
<!-- vpmodule:atom:begin fail-toward-the-safe-default-when-a-flag-is-malformed -->
---
instruction_id: fail-toward-the-safe-default-when-a-flag-is-malformed
title: Fail toward the safe default when a flag is malformed
summary: A mistyped or unreadable switch value takes the conservative branch; the risky branch is never the fallback.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - safe-defaults
conditions_applies_when: A switch that decides between a conservative and a risky branch is read.
conditions_does_not_apply_when: The switch was read and its value is canonical.
artifact_contract_output_type: switch-default
artifact_contract_required_data:
  - the value that was read
  - the branch that was taken
artifact_contract_verified_by: a malformed value took the conservative branch and a tool failure never took the risky one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fail toward the safe default when a flag is malformed
a mistyped or non-canonical value
gets the conservative behavior, and any tooling failure
fails safe to serial — never the opposite polarity, since firing concurrent
missing, malformed, string, numeric, or otherwise unrecognized values fail safe to
<!-- vpmodule:atom:end fail-toward-the-safe-default-when-a-flag-is-malformed -->