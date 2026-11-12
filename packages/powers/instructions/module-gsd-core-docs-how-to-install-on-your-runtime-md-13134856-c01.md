---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-install-on-your-runtime-md-13134856-c01"
title: "gsd-core: docs/how-to/install-on-your-runtime.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/install-on-your-runtime.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/install-on-your-runtime.md\"}"
atom_ids:
  - a-marker-in-a-directory-governs-every-file-in-it
  - do-not-copy-the-source-past-the-transformation
atom_count: 2
atoms: "[{\"atom_id\":\"a-marker-in-a-directory-governs-every-file-in-it\",\"file_sha256\":\"7b916ac1d317ba289d30c47be4a58005bfa6c7a190c0d0bdcbc17f0ed065608a\",\"content_sha256\":\"690ed6e0c45be9b19e36292fb3afda0475a168f011234f93ce85281e85f4b7ec\",\"file_bytes\":1282,\"body_bytes\":119},{\"atom_id\":\"do-not-copy-the-source-past-the-transformation\",\"file_sha256\":\"ac8eb6d46d7225e9d0b7e085d17a125ec8ddaf738ec2937da739f67899dda751\",\"content_sha256\":\"9bb84644bdbb491c91df0684170fdb15f578d75028be9144a7bc23263db6b6a9\",\"file_bytes\":1311,\"body_bytes\":146}]"
carrier_sha256: a36c58337aa6ba67cee7bf63ec55effb88db5f618b595c49f0c60b39c12e46f1
carrier_bytes: 2896
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-marker-in-a-directory-governs-every-file-in-it -->
---
instruction_id: a-marker-in-a-directory-governs-every-file-in-it
title: A marker in a directory governs every file in it
summary: "A marker written into a directory changes how every file in that directory resolves, not only the file the marker was written for."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A marker or override is written into a directory that holds other files.
conditions_does_not_apply_when: The marker is written for one file and the directory holds only that file.
artifact_contract_output_type: marker-scope-note
artifact_contract_required_data:
  - the marker
  - the directory it governs
  - the files it reaches
artifact_contract_verified_by: the scope of the marker covers the whole directory and the trade-off is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/install-on-your-runtime.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# A marker in a directory governs every file in it
shadows your config root for **every** `.js` file in that directory
<!-- vpmodule:atom:end a-marker-in-a-directory-governs-every-file-in-it -->
<!-- vpmodule:atom:begin do-not-copy-the-source-past-the-transformation -->
---
instruction_id: do-not-copy-the-source-past-the-transformation
title: Do not copy the source past the transformation
summary: Copying the shipped source files by hand bypasses the transformation the packaging performs and produces schema errors or missing commands.
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - source-conversion
conditions_applies_when: The artefacts of a package are put in place by hand instead of by its installer.
conditions_does_not_apply_when: "The package's own installer performs the transformation."
artifact_contract_output_type: installation-record
artifact_contract_required_data:
  - the source that was copied
  - the transformation that was skipped
artifact_contract_verified_by: "the transformation was run, so no schema error and no missing command appears"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/install-on-your-runtime.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not copy the source past the transformation
Doing so bypasses the transformations and produces schema-validation errors or missing commands.
<!-- vpmodule:atom:end do-not-copy-the-source-past-the-transformation -->