---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-contributing-cross-platform-portability-rules-md-9cac0035-c01"
title: "gsd-core: docs/contributing/cross-platform-portability-rules.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/contributing/cross-platform-portability-rules.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/contributing/cross-platform-portability-rules.md\"}"
atom_ids:
  - scope-the-platform-only-precondition-and-keep-the-behavioral-assertion
  - set-the-environment-variable-the-platform-actually-reads
atom_count: 2
atoms: "[{\"atom_id\":\"scope-the-platform-only-precondition-and-keep-the-behavioral-assertion\",\"file_sha256\":\"85d9c4e1ea208f62c4cfeb61b645b2a3c0f4c21fbfcdf12c980fe262b5cd371c\",\"content_sha256\":\"280dee3fc71c3dbcbaa7f0c244458f10f1611e41e341eff0e5893f7441f32229\",\"file_bytes\":1610,\"body_bytes\":302},{\"atom_id\":\"set-the-environment-variable-the-platform-actually-reads\",\"file_sha256\":\"dfb596908b0012470608938c046d66b1183da1d704a527f9ba9b1d9d7e1ac0f5\",\"content_sha256\":\"9efabae95f6da00af40f48bb49932a1fb0750284c9ba1545f10bff5ca70d52cc\",\"file_bytes\":1599,\"body_bytes\":358}]"
carrier_sha256: 12e790dd942272ffafe48275133e12adf3ed1ea04c27e589ed48cc27fd7d84d0
carrier_bytes: 3576
revision: 1
status: active
---
<!-- vpmodule:atom:begin scope-the-platform-only-precondition-and-keep-the-behavioral-assertion -->
---
instruction_id: scope-the-platform-only-precondition-and-keep-the-behavioral-assertion
title: Scope the platform-only precondition and keep the behavioral assertion
summary: An assertion that only one platform can satisfy is put behind a platform check; the behavioral assertion that every platform can satisfy stays and runs everywhere.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "A test asserts something the platform does not support, and a behavioral assertion is available beside it."
conditions_does_not_apply_when: The assertion is valid on every platform.
artifact_contract_output_type: platform-scoped-assertion
artifact_contract_required_data:
  - the platform-only precondition
  - the behavioral assertion that stays
  - the platform check that scopes it
artifact_contract_verified_by: the platform-only assertion is scoped and the behavioral assertion still runs on every platform
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope the platform-only precondition and keep the behavioral assertion
- **Gate it behind a platform check and keep the real behavioral assertion running on every OS** (do not delete it — scope it)
- Prefer asserting the *behavior* (command shape, runnability) over the raw mode bit where you can.
<!-- vpmodule:atom:end scope-the-platform-only-precondition-and-keep-the-behavioral-assertion -->
<!-- vpmodule:atom:begin set-the-environment-variable-the-platform-actually-reads -->
---
instruction_id: set-the-environment-variable-the-platform-actually-reads
title: Set the environment variable the platform actually reads
summary: "A test that redirects a directory or a home path sets the variables the target platform reads, and restores every one of them on teardown."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test overrides the home directory or the temporary directory for a child process.
conditions_does_not_apply_when: The test runs on one platform only and the variable is the same on all of them.
artifact_contract_output_type: environment-override
artifact_contract_required_data:
  - the variables the platform reads
  - the value they are set to
  - the teardown that restores them
artifact_contract_verified_by: every variable the target platform reads is set and every one of them is restored
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Set the environment variable the platform actually reads
- Windows uses `USERPROFILE` as the home directory environment variable, not `HOME`.
- Per Node's own docs, `os.tmpdir()` on Windows consults `TEMP` then `TMP` — it never reads `TMPDIR` there.
- Whenever a test sets `process.env.HOME`, it must also set `process.env.USERPROFILE` to the same value
<!-- vpmodule:atom:end set-the-environment-variable-the-platform-actually-reads -->