---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-review-verification-capabilities-md-46cbe975-c01"
title: "gsd-core: docs/reference/review-verification-capabilities.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/reference/review-verification-capabilities.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/review-verification-capabilities.md\"}"
atom_ids:
  - declare-what-a-hook-produces-and-consumes
  - resolve-the-hook-list-from-the-registry-not-from-the-config-key
  - skip-the-hook-whose-output-is-already-there
atom_count: 3
atoms: "[{\"atom_id\":\"declare-what-a-hook-produces-and-consumes\",\"file_sha256\":\"7e24da8c319b7de82351d02b9f56c8592df41f9330aa8690d4f8369e3e848eef\",\"content_sha256\":\"99f9116561f4948138663cc3bbd9eb3d19cc726083abe5fbe901145fc15b33c8\",\"file_bytes\":1694,\"body_bytes\":453},{\"atom_id\":\"resolve-the-hook-list-from-the-registry-not-from-the-config-key\",\"file_sha256\":\"e5f5c636c02086c560db9af8703d848e2d4bd29b69fc49e7fbbf530c86eb7076\",\"content_sha256\":\"b7fa821924fa34ff389f3caa074b5c09bcee2cd503d1bbefcb2c68649a1d2471\",\"file_bytes\":1708,\"body_bytes\":423},{\"atom_id\":\"skip-the-hook-whose-output-is-already-there\",\"file_sha256\":\"c05224d20d1c30e9058008414f71a54e379c60d7bf5571d0b3b60858c90052ab\",\"content_sha256\":\"8e7b6ab782d6f05275142fc5d6806ccffcfee975842350e9fbccc80f96863f8e\",\"file_bytes\":1593,\"body_bytes\":417}]"
carrier_sha256: 336cd920c78da3c2032606fc9808a21fe51307afe9b0bcce72f92848efd02ba7
carrier_bytes: 5462
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-what-a-hook-produces-and-consumes -->
---
instruction_id: declare-what-a-hook-produces-and-consumes
title: Declare what a hook produces and consumes
summary: "Every step and contribution declares the artifacts it writes and the ones it reads, names the error posture it uses, and a predicate that must block a release is declared as a gate."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - expand-contract
  - control-tiering
  - control-failure-posture-policy
conditions_applies_when: A hook is being declared.
conditions_does_not_apply_when: The hook writes nothing and reads nothing.
artifact_contract_output_type: hook-declaration
artifact_contract_required_data:
  - the artifacts it produces
  - the artifacts it consumes
  - the error posture and the gate it uses
artifact_contract_verified_by: the hook declares what it produces and consumes and how it fails
compatibility_excludes:
  - fail-open-loudly-when-a-control-cannot-load
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/review-verification-capabilities.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Declare what a hook produces and consumes
- Declare `produces` and `consumes` arrays for every step and contribution hook.
- For a `verify:post` step, `produces` must name every phase artifact the step writes: it is what keeps the step from re-running after the verification fingerprint
- Use `onError: "halt"` for verification work that must stop advancement when it fails.
- Use a blocking `gate` for ship-time predicates that must prevent release.
<!-- vpmodule:atom:end declare-what-a-hook-produces-and-consumes -->
<!-- vpmodule:atom:begin resolve-the-hook-list-from-the-registry-not-from-the-config-key -->
---
instruction_id: resolve-the-hook-list-from-the-registry-not-from-the-config-key
title: "Resolve the hook list from the registry, not from the config key"
summary: "A consumer resolves the effective hooks through the registry; it never branches on the raw activation key, because the key alone does not say whether the hook runs."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A consumer needs to know which hooks are active.
conditions_does_not_apply_when: The consumer reads the activation key directly and calls it active.
artifact_contract_output_type: registry-resolution
artifact_contract_required_data:
  - the entry point that resolves the hooks
  - the two conditions that make a hook active
  - the key that must not be branched on
artifact_contract_verified_by: the hooks were resolved through the registry and not by branching on the activation key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/review-verification-capabilities.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Resolve the hook list from the registry, not from the config key
- Workflows must not branch directly on the boolean activation keys. Workflows resolve activation by calling `gsd-tools loop render-hooks <point>`.
- The resolver evaluates each hook's `when` key against the project config and the capability config default. If the key is absent and the capability declaration default is `true`, the hook is configured on.
<!-- vpmodule:atom:end resolve-the-hook-list-from-the-registry-not-from-the-config-key -->
<!-- vpmodule:atom:begin skip-the-hook-whose-output-is-already-there -->
---
instruction_id: skip-the-hook-whose-output-is-already-there
title: Skip the hook whose output is already there
summary: "A step whose declared outputs are all present is skipped rather than run again, so a second run cannot rewrite a file the report already covers."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A step declares what it produces and its output is already on disk.
conditions_does_not_apply_when: The step has produced nothing yet.
artifact_contract_output_type: produces-present-skip
artifact_contract_required_data:
  - "the step's declared outputs"
  - the presence check
  - the reason the skip is recorded under
artifact_contract_verified_by: the step was skipped because its declared outputs were already present
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/review-verification-capabilities.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Skip the hook whose output is already there
- A `step` hook with a non-empty `produces` list, every entry of which already exists in the phase directory (for example `01-SECURITY.md` for `SECURITY.md`), moves from `activeHooks` to `skippedHooks` with `reason: "produces-present"`.
- Re-running it would rewrite a file the verification report may cover and leave the report `stale` against the workflow's own write.
<!-- vpmodule:atom:end skip-the-hook-whose-output-is-already-there -->