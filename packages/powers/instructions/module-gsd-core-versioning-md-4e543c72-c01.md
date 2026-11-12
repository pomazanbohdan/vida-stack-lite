---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-versioning-md-4e543c72-c01"
title: "gsd-core: VERSIONING.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:VERSIONING.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"VERSIONING.md\"}"
atom_ids:
  - keep-every-versioned-manifest-in-step-with-the-package-version
  - keep-pre-releases-off-the-default-install-channel
atom_count: 2
atoms: "[{\"atom_id\":\"keep-every-versioned-manifest-in-step-with-the-package-version\",\"file_sha256\":\"0b0d103a7ea68a5734ee22afbe99be3aab3658a71fde36489ed0127bb2e56bf8\",\"content_sha256\":\"9d546d856562dcb54234222bde78a8a2e3f65a520fe194300b5b2b54e9193582\",\"file_bytes\":1994,\"body_bytes\":725},{\"atom_id\":\"keep-pre-releases-off-the-default-install-channel\",\"file_sha256\":\"51e931bd5b9b24ed4fe1ca6a9700bd6d5eb22e42616a9431213c3d70a6b3411f\",\"content_sha256\":\"e306749810e87dcd480828bf3e6a5a7608e36be979ec3b65e0d8a56c6d556f51\",\"file_bytes\":1845,\"body_bytes\":649}]"
carrier_sha256: 906a68ceb7c5ff904361ffbe7f1bd5519acafb5e22f0cb26653101a4b87ebe63
carrier_bytes: 4176
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-every-versioned-manifest-in-step-with-the-package-version -->
---
instruction_id: keep-every-versioned-manifest-in-step-with-the-package-version
title: Keep every versioned manifest in step with the package version
summary: Every manifest that carries a version field matches the package version; a new one is registered and a regression test fails when an unregistered manifest is found.
capability_tags:
  - integrate-branch
pattern_tags:
  - package-lifecycle
conditions_applies_when: "A release is cut, or a new manifest that carries a version field is added."
conditions_does_not_apply_when: The repository has no manifest with a version field.
artifact_contract_output_type: manifest-version-sync
artifact_contract_required_data:
  - the manifests that carry a version field
  - the package version they must match
  - the registry entry for each such manifest
artifact_contract_verified_by: the regression test finds no committed manifest with a version field that is missing from the registry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=VERSIONING.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep every versioned manifest in step with the package version
Certain runtime-integration manifests carry a `version` field that must always match `package.json`:
- the plugin manifest
- the marketplace manifest; its version lives at `plugins[0].version`
- the extension manifest
The `version` lifecycle script
stamps these files automatically
and stages them so they are included in the release commit alongside `package.json`.
To add a new manifest that must track the package version, register its path (and, if its version field is not top-level, its dotted `versionKey`)
A regression test enforces this:
it scans all committed JSON files for a matching `version` field and fails if any are missing from the registry.
<!-- vpmodule:atom:end keep-every-versioned-manifest-in-step-with-the-package-version -->
<!-- vpmodule:atom:begin keep-pre-releases-off-the-default-install-channel -->
---
instruction_id: keep-pre-releases-off-the-default-install-channel
title: Keep pre-releases off the default install channel
summary: "Only two distribution tags exist; a pre-release reaches a user only when the user opts in, and one version uses one pre-release type throughout its cycle."
capability_tags:
  - integrate-branch
pattern_tags:
  - release-readiness
conditions_applies_when: A pre-release is prepared or the distribution tags are defined.
conditions_does_not_apply_when: The release is a stable production release.
artifact_contract_output_type: release-tag-scheme
artifact_contract_required_data:
  - the two distribution tags and what each means
  - the pre-release type of the version
  - the rule that a pre-release is opt-in
artifact_contract_verified_by: the default install channel carries only stable releases and each version uses one pre-release type
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=VERSIONING.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep pre-releases off the default install channel
Only two tags, following Angular/Next.js convention:
| Tag | Meaning |
|-----|---------|
| `latest` | Stable production release |
| `next` | Pre-release (RC or beta) |
The version string (`-rc.1` vs `-beta.1`) communicates stability level.
Users never get pre-releases unless they explicitly opt in.
**beta** (major releases only): Feature-complete but not fully tested.
API mostly stable.
Used for major releases to signal a longer testing cycle.
**rc** (minor releases only): Production-ready candidate.
Only critical fixes expected.
Each version uses one pre-release type throughout its cycle.
<!-- vpmodule:atom:end keep-pre-releases-off-the-default-install-channel -->