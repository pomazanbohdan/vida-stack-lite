---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-skill-mapping-matrix-md-fbfbc6ee-c01"
title: "gsd-core: docs/reference/skill-mapping-matrix.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/reference/skill-mapping-matrix.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/skill-mapping-matrix.md\"}"
atom_ids:
  - use-the-platforms-native-mechanism-not-an-undocumented-cache
  - verify-the-loader-behaviour-before-you-mirror-its-shape
atom_count: 2
atoms: "[{\"atom_id\":\"use-the-platforms-native-mechanism-not-an-undocumented-cache\",\"file_sha256\":\"827716c08e61606cfcc06e9134341c4b1b0ec1945923b5d86c5736ddf272185b\",\"content_sha256\":\"aafd98c28b1a0f544cfbb05d2178667cc08f9c8e1a08dd4ef9b56c484f67ce6a\",\"file_bytes\":1581,\"body_bytes\":287},{\"atom_id\":\"verify-the-loader-behaviour-before-you-mirror-its-shape\",\"file_sha256\":\"c2122fefb403187944d668abf6a1b0260e617d1e3de235085e6953ed1aa4ab39\",\"content_sha256\":\"2302e9176f7b3bc54c67957d89bfe8744ccfefc965d85c4ff2c04191fe4d775c\",\"file_bytes\":1478,\"body_bytes\":208}]"
carrier_sha256: 682257a65f551a74b20af785082c277f4a93a49106c7a5bbfb67868ad6bb46c9
carrier_bytes: 3404
revision: 1
status: active
---
<!-- vpmodule:atom:begin use-the-platforms-native-mechanism-not-an-undocumented-cache -->
---
instruction_id: use-the-platforms-native-mechanism-not-an-undocumented-cache
title: "Use the platform's native mechanism, not an undocumented cache"
summary: "A package is provided and consumed through the platform's own documented mechanism; reading another plugin's ephemeral cache is a workaround and is refused."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: "A package is being shipped to a platform, or a platform is being integrated."
conditions_does_not_apply_when: The platform offers no documented mechanism and a cache is the only way.
artifact_contract_output_type: native-mechanism
artifact_contract_required_data:
  - "the platform's documented mechanism"
  - the cache reading that is refused
  - why the native mechanism is the contract
artifact_contract_verified_by: "the package goes through the platform's documented mechanism and no cache is read"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/skill-mapping-matrix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Use the platform's native mechanism, not an undocumented cache
- each platform's first-party packaging should provide and consume skills through the platform's *documented, native* mechanism.
- The platform's native mechanism is the contract; cache-reading is a workaround, not a fix.
<!-- vpmodule:atom:end use-the-platforms-native-mechanism-not-an-undocumented-cache -->
<!-- vpmodule:atom:begin verify-the-loader-behaviour-before-you-mirror-its-shape -->
---
instruction_id: verify-the-loader-behaviour-before-you-mirror-its-shape
title: Verify the loader behaviour before you mirror its shape
summary: "The shape that is given to a target follows the loader behaviour that was verified for it; where the loader behaviour is not verified, the conservative shape is kept."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: The layout that is produced for a target is being chosen.
conditions_does_not_apply_when: The loader behaviour of the target is documented and confirmed.
artifact_contract_output_type: loader-verified-layout
artifact_contract_required_data:
  - the loader behaviour that was verified
  - the shape that follows from it
  - what is kept when it is unverified
artifact_contract_verified_by: the shape follows the verified loader behaviour and stays conservative when it is unverified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/skill-mapping-matrix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Verify the loader behaviour before you mirror its shape
- The nesting flag is set per the verified loader behavior of each runtime.
- Loader depth not independently verified; kept flat to avoid mis-nesting
<!-- vpmodule:atom:end verify-the-loader-behaviour-before-you-mirror-its-shape -->