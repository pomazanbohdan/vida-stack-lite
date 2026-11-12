---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-features-opt-in-parallel-reviewer-lanes-md-f3c15b6c-c01"
title: "gsd-core: docs/features/opt-in-parallel-reviewer-lanes.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/features/opt-in-parallel-reviewer-lanes.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/features/opt-in-parallel-reviewer-lanes.md\"}"
atom_ids:
  - keep-the-result-order-independent-of-completion-order
  - let-the-default-fail-in-the-direction-it-protects
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-result-order-independent-of-completion-order\",\"file_sha256\":\"ab6de937b19c4e1766a9702515216dc511a7e22dd99c0605144cbb0f7ea997c1\",\"content_sha256\":\"569cbb348c9eb81a2d0af06f2bb26ef9b27ff787aa5b359e5c11e89f3d649afc\",\"file_bytes\":1522,\"body_bytes\":321},{\"atom_id\":\"let-the-default-fail-in-the-direction-it-protects\",\"file_sha256\":\"444f67b7b14f55b4e80c06e84c8f541025e33386f53adf9f712f9820ad48529e\",\"content_sha256\":\"d1e827fc79a6de13c60811fd2f0fa0b0bc0d139bf163f8f57d8b9bda0964fdb8\",\"file_bytes\":1670,\"body_bytes\":512}]"
carrier_sha256: 48c8361181ee91c30fe1575ff508d4af1eefadf9c332494aad614d12e15cc919
carrier_bytes: 3511
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-result-order-independent-of-completion-order -->
---
instruction_id: keep-the-result-order-independent-of-completion-order
title: Keep the result order independent of the completion order
summary: "Concurrent results are written to separate files and concatenated in the selected order, so completion order never reaches the artefact."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several workers run at once and their results are combined.
conditions_does_not_apply_when: One worker produces the whole result.
artifact_contract_output_type: ordered-results
artifact_contract_required_data:
  - the order the workers were selected in
  - the file each result was written to
  - the order the results were concatenated in
artifact_contract_verified_by: the artefact reads identically whether the workers ran in sequence or at once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/opt-in-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the result order independent of the completion order
Result ordering is unchanged in both modes.
Per-lane results are written to slug-scoped files and concatenated in reviewer-selection order after the join
Completion order never reaches the artifact.
This also means concurrent lanes never share an append handle
<!-- vpmodule:atom:end keep-the-result-order-independent-of-completion-order -->
<!-- vpmodule:atom:begin let-the-default-fail-in-the-direction-it-protects -->
---
instruction_id: let-the-default-fail-in-the-direction-it-protects
title: Let the default fail in the direction it protects
summary: "The polarity of a guard follows what its default protects: a mistyped opt-in must not enable the behaviour the default exists to prevent."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A behaviour is switched on by a configuration value.
conditions_does_not_apply_when: The configuration value only changes a report.
artifact_contract_output_type: config-polarity
artifact_contract_required_data:
  - the value that opts in
  - the values that leave the default in place
  - what the default protects
artifact_contract_verified_by: a mistyped value leaves the conservative behaviour in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/opt-in-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the default fail in the direction it protects
Only the exact value `true` opts in — `"1"`, `"yes"` and `"TRUE"` all stay sequential, so a mistyped config gets the conservative behavior rather than concurrent requests at a rate-limited provider.
This polarity is deliberately the opposite of the `commit_docs` guard, which fails open: there, failing open preserves user intent; here it would fire the very requests the default exists to prevent.
A failure to read the config falls back to sequential too.
<!-- vpmodule:atom:end let-the-default-fail-in-the-direction-it-protects -->