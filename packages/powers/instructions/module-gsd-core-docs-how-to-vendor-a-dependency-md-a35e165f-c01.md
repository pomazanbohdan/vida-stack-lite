---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-vendor-a-dependency-md-a35e165f-c01"
title: "gsd-core: docs/how-to/vendor-a-dependency.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/vendor-a-dependency.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/vendor-a-dependency.md\"}"
atom_ids:
  - build-before-you-regenerate-the-manifest
  - keep-a-vendored-package-a-dev-dependency
  - load-the-candidate-in-isolation-before-vendoring-it
  - record-the-provenance-of-every-vendored-artifact
atom_count: 4
atoms: "[{\"atom_id\":\"build-before-you-regenerate-the-manifest\",\"file_sha256\":\"850498d2e264cf4786f419488f96d76a77f327d9ad76a49aa2b16573d2c39047\",\"content_sha256\":\"5f162789baef7460fec3be03f430a0e7bb4c89eb74f95eba0029899065446a62\",\"file_bytes\":1510,\"body_bytes\":410},{\"atom_id\":\"keep-a-vendored-package-a-dev-dependency\",\"file_sha256\":\"6a21c2bdb716f00a87879f559b2dd7552a3b6b9253c5bc1f3027ec9c89e1cb6d\",\"content_sha256\":\"e3985e03f42b4a12e72145239a226222b7ebaa71a5f8d5071bf2c654d1272a1e\",\"file_bytes\":1572,\"body_bytes\":473},{\"atom_id\":\"load-the-candidate-in-isolation-before-vendoring-it\",\"file_sha256\":\"07da347ea5173abb45f526686cf06d31f9ef192bdffc4659733a8743941dbbf6\",\"content_sha256\":\"6f86079f54ebdc032b02889dd5dbd5e3a9cf77ed6ac331c48611febba8731e8b\",\"file_bytes\":1780,\"body_bytes\":712},{\"atom_id\":\"record-the-provenance-of-every-vendored-artifact\",\"file_sha256\":\"c79afa3d1e35d7beee814806a6283e12e8637a2b3532fca2696f4abe958bf2ac\",\"content_sha256\":\"81220bd355f15b474fb299f1d08fb834fbdf1e64aa9b8731c451190af9bc6f8e\",\"file_bytes\":1455,\"body_bytes\":347}]"
carrier_sha256: 824bb939fdc37fc2d0929ee723e0fd93cd84219040e657e507b869062a52c0ec
carrier_bytes: 6906
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-before-you-regenerate-the-manifest -->
---
instruction_id: build-before-you-regenerate-the-manifest
title: Build before you regenerate the manifest
summary: "A manifest derived from the compiled tree is regenerated after the build, or it silently omits what was just added."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A generated manifest is refreshed after a change to the compiled tree.
conditions_does_not_apply_when: The manifest is derived from the sources directly.
artifact_contract_output_type: manifest-regeneration-order
artifact_contract_required_data:
  - the build step
  - the manifest that was regenerated
artifact_contract_verified_by: the manifest was regenerated after the build and describes the new file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Build before you regenerate the manifest
If you regenerate the inventory manifest before building, the generator either misses your new vendored file or captures a stale prior build's contents.
Running step 3 before step 1/2 produces a manifest that silently omits or misdescribes the new vendored file, and that drift is exactly what the manifest gate exists to catch on someone else's PR instead of yours.
<!-- vpmodule:atom:end build-before-you-regenerate-the-manifest -->
<!-- vpmodule:atom:begin keep-a-vendored-package-a-dev-dependency -->
---
instruction_id: keep-a-vendored-package-a-dev-dependency
title: Keep a vendored package a dev-dependency
summary: "The vendored copy is what ships, so the package stays a dev dependency that only pins the version the copy was taken from."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A third-party package is copied into the tree.
conditions_does_not_apply_when: The package is installed normally from a registry.
artifact_contract_output_type: vendored-package-policy
artifact_contract_required_data:
  - the pinned version
  - where the vendored copy lives
artifact_contract_verified_by: the package is declared as a dev dependency and the vendored copy is what ships
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a vendored package a dev-dependency
The package that gets vendored stays pinned in `package.json` `devDependencies`, never `dependencies`.
Promoting it to `dependencies` does not make the vendored copy redundant — the installer never runs `npm install` on your behalf inside a target tree, so a runtime `dependencies` entry buys nothing there
`devDependencies` is correct precisely because the vendored copy, not the npm-resolved package, is what ships at runtime
<!-- vpmodule:atom:end keep-a-vendored-package-a-dev-dependency -->
<!-- vpmodule:atom:begin load-the-candidate-in-isolation-before-vendoring-it -->
---
instruction_id: load-the-candidate-in-isolation-before-vendoring-it
title: Load the candidate in isolation before vendoring it
summary: "The candidate artifact is loaded on its own, outside the normal resolution, to prove it needs no sibling file."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: An upstream artifact is chosen for vendoring.
conditions_does_not_apply_when: The artifact is already vendored.
artifact_contract_output_type: candidate-verification
artifact_contract_required_data:
  - the upstream artifact
  - the isolation check that loaded it
artifact_contract_verified_by: the artifact loaded in isolation without reaching for a sibling file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load the candidate in isolation before vendoring it
You need a **self-contained CJS or UMD bundle** — one file, loadable with a single `require()`, containing zero `require()` calls of its own to anything outside Node builtins.
Do not reach for the package's `exports.require`/`main` entry point (often `index.js`) without checking it first: that entry is frequently a thin loader that `require()`s several sibling files, which is exactly the shape vendoring cannot tolerate
Verify your candidate the same way: `require()` it in isolation (outside this repo's `node_modules` resolution, e.g. from a scratch directory with only that one file present) and confirm it loads without reaching for a sibling file.
<!-- vpmodule:atom:end load-the-candidate-in-isolation-before-vendoring-it -->
<!-- vpmodule:atom:begin record-the-provenance-of-every-vendored-artifact -->
---
instruction_id: record-the-provenance-of-every-vendored-artifact
title: Record the provenance of every vendored artifact
summary: "Each vendored artifact records which upstream file it came from, why that one and not the entry point, and how to refresh it."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - decision-trail
conditions_applies_when: A vendored artifact is added to the tree.
conditions_does_not_apply_when: The artifact is already documented.
artifact_contract_output_type: vendored-artifact-provenance
artifact_contract_required_data:
  - the upstream artifact
  - the reason it is the vendorable one
  - the refresh command
artifact_contract_verified_by: "the entry names the upstream artifact, the reason and the refresh command"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Record the provenance of every vendored artifact
Add an entry alongside the existing ones: which upstream artifact you copied, why it (and not the package's main entry point) is the vendorable one, which symbols it exposes, and the refresh command.
This is the first place a future contributor looks when `lint-vendored-deps.cjs` reports drift.
<!-- vpmodule:atom:end record-the-provenance-of-every-vendored-artifact -->