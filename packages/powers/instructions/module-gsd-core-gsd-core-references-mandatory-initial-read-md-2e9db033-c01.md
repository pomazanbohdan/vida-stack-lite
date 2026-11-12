---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-mandatory-initial-read-md-2e9db033-c01"
title: "gsd-core: gsd-core/references/mandatory-initial-read.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/mandatory-initial-read.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/mandatory-initial-read.md\"}"
atom_ids:
  - load-every-required-reading-before-any-other-action
  - read-every-required-file-before-any-other-action
atom_count: 2
atoms: "[{\"atom_id\":\"load-every-required-reading-before-any-other-action\",\"file_sha256\":\"67138f2e116d67c5808e95cb8e8899f634028c7244f82294dcc88f1e6a603138\",\"content_sha256\":\"a7746f4b5c30db2c356711e8f902c7d8a42801b93c99404cef7a8eced43f0e7a\",\"file_bytes\":1440,\"body_bytes\":234},{\"atom_id\":\"read-every-required-file-before-any-other-action\",\"file_sha256\":\"ce3a1f51ae37c3703c9e8034b2fc1f7035ab56422bbf14a48bd2aa93f710e99b\",\"content_sha256\":\"94369e1ca2a43139e44866b3eb7e36c9a1f2fd9ed95e8809c9a159f4feff2757\",\"file_bytes\":1359,\"body_bytes\":209}]"
carrier_sha256: b0bb858b70994670d72e3bd27fff85c8c0189caf73f17700fd72070fbc0f5075
carrier_bytes: 3112
revision: 1
status: active
---
<!-- vpmodule:atom:begin load-every-required-reading-before-any-other-action -->
---
instruction_id: load-every-required-reading-before-any-other-action
title: Load every required reading before any other action
summary: "When the prompt carries a required-reading block, every file it lists is read before anything else happens."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: The prompt contains a required-reading block.
conditions_does_not_apply_when: The prompt names no required reading.
artifact_contract_output_type: loaded-context
artifact_contract_required_data:
  - the files listed in the required reading
  - the fact that all of them were read first
artifact_contract_verified_by: every listed file was read before the first other action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/mandatory-initial-read.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body gives a generic pre-action reading rule for any required_reading block but names no substantive domain; a domain would be inferred from the reader or tool.
---

# Load every required reading before any other action
If the prompt contains a `<required_reading>` block, you MUST use the `Read` tool to load every file listed there before performing any other actions. This is your primary context
<!-- vpmodule:atom:end load-every-required-reading-before-any-other-action -->
<!-- vpmodule:atom:begin read-every-required-file-before-any-other-action -->
---
instruction_id: read-every-required-file-before-any-other-action
title: Read every required file before any other action
summary: A prompt that names the files to read is read first and in full; that set is the primary context of the run and nothing else starts before it is loaded.
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: The prompt names the files that have to be read.
conditions_does_not_apply_when: The prompt names no files to read.
artifact_contract_output_type: required-reading
artifact_contract_required_data:
  - the files that were read
  - the order they were read in
artifact_contract_verified_by: every listed file was read before any other action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/mandatory-initial-read.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body is a generic prompt-reading rule without source-specific content for a supported subject domain.
---

# Read every required file before any other action
If the prompt contains a `<required_reading>` block,
you MUST load every file listed there before performing any other actions. This is your primary context.
<!-- vpmodule:atom:end read-every-required-file-before-any-other-action -->