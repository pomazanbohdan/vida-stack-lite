---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-bin-lib-vendor-readme-md-b2665197-c01"
title: "gsd-core: gsd-core/bin/lib/vendor/README.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/bin/lib/vendor/README.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/bin/lib/vendor/README.md\"}"
atom_ids:
  - declare-only-the-symbols-you-use-in-a-hand-written-type-twin
  - never-hand-edit-a-vendored-artifact
atom_count: 2
atoms: "[{\"atom_id\":\"declare-only-the-symbols-you-use-in-a-hand-written-type-twin\",\"file_sha256\":\"c5817fcfd81ed355b166895549fd5ecccf6fbf1695258c4e8b7de4cf3dcfcf7d\",\"content_sha256\":\"60f4d06f2a848d8f432510f243b937c72cf43d71d169f44b659a4da8bad3aa69\",\"file_bytes\":1589,\"body_bytes\":386},{\"atom_id\":\"never-hand-edit-a-vendored-artifact\",\"file_sha256\":\"891ddc5ebeed5aaba98a63786b5f2c426448160c3c366e34076182c4441fca66\",\"content_sha256\":\"b068406cb5f273bc472990fe1ff542869a7609635bc1909c388066b8b871722a\",\"file_bytes\":1343,\"body_bytes\":225}]"
carrier_sha256: 360bbc07b86fc3cdacb35b0080045e0413389aade14508ff9324188b4a6f621b
carrier_bytes: 3237
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-only-the-symbols-you-use-in-a-hand-written-type-twin -->
---
instruction_id: declare-only-the-symbols-you-use-in-a-hand-written-type-twin
title: Declare only the symbols you use in a hand-written type twin
summary: "A type declaration that has no upstream to copy declares only the symbols the code actually uses, and the ones it leaves out stay unreachable at compile time."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A type declaration is written by hand because the upstream ships none.
conditions_does_not_apply_when: The upstream ships a declaration that can be copied.
artifact_contract_output_type: minimal-type-twin
artifact_contract_required_data:
  - the symbols that are declared
  - the symbols that stay unreachable
  - why the narrowness is deliberate
artifact_contract_verified_by: only the used symbols are declared and the rest stayed unreachable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/bin/lib/vendor/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Declare only the symbols you use in a hand-written type twin
- declares only the symbols actually used (`load`, `dump`, `FAILSAFE_SCHEMA`, `YAMLException`), and is **excluded** from `lint-vendored-deps.cjs`'s byte-compare — there is no upstream file to compare it against.
- The narrowness is deliberate: anchors, aliases, custom types and `loadAll` are unreachable from typed code
<!-- vpmodule:atom:end declare-only-the-symbols-you-use-in-a-hand-written-type-twin -->
<!-- vpmodule:atom:begin never-hand-edit-a-vendored-artifact -->
---
instruction_id: never-hand-edit-a-vendored-artifact
title: Never hand-edit a vendored artifact
summary: "A vendored artifact is refreshed through the command that produced it, and a copy that drifts from its upstream is a build failure."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A vendored copy of an upstream artifact is about to be changed.
conditions_does_not_apply_when: The artifact is written by the project itself.
artifact_contract_output_type: vendored-artifact
artifact_contract_required_data:
  - the refresh command
  - the upstream the copy is compared against
  - what a drift does
artifact_contract_verified_by: the artifact was refreshed by the command and the drift check stays green
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/bin/lib/vendor/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never hand-edit a vendored artifact
- Never edit these artifacts directly. Refresh bundled packages through the vendoring command above.
- fails CI if any vendored copy drifts byte-for-byte from its `node_modules` upstream
<!-- vpmodule:atom:end never-hand-edit-a-vendored-artifact -->