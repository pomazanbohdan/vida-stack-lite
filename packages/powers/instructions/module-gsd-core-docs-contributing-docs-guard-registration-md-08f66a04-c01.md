---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-contributing-docs-guard-registration-md-08f66a04-c01"
title: "gsd-core: docs/contributing/docs-guard-registration.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/contributing/docs-guard-registration.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/contributing/docs-guard-registration.md\"}"
atom_ids:
  - make-a-new-exemption-a-visible-diff
  - register-a-test-that-reads-shipped-content-so-it-runs-on-the-change
  - register-the-wide-pattern-rather-than-a-guessed-narrow-one
atom_count: 3
atoms: "[{\"atom_id\":\"make-a-new-exemption-a-visible-diff\",\"file_sha256\":\"a9d9af716ddf883ecf03bb688853f00df9cf2ce8ea083d43bb00e07dc0a2e959\",\"content_sha256\":\"171654914e886244f3b06ac9eb32c7be447769cbe1d8fdd55e1982abcecee34c\",\"file_bytes\":1654,\"body_bytes\":408},{\"atom_id\":\"register-a-test-that-reads-shipped-content-so-it-runs-on-the-change\",\"file_sha256\":\"8f21b470529d8d104dff683ca9a7602dde839b0ab7d05499b86f9841372581d7\",\"content_sha256\":\"54c3fc5c3708bba8af1fb5d2c5ac19eb21b5989d6bce0be7799762b4803fcf99\",\"file_bytes\":1920,\"body_bytes\":631},{\"atom_id\":\"register-the-wide-pattern-rather-than-a-guessed-narrow-one\",\"file_sha256\":\"8652da51fdf7318bb366a9258a69061629d8700c3da9f0ed7ab3385a4b2a8bed\",\"content_sha256\":\"8f46cf91568415297e339d89ef2b22f1754af4d11420a3d2d862066e03a4bbd7\",\"file_bytes\":1731,\"body_bytes\":504}]"
carrier_sha256: cb5fba55c6260234129ba427b0aef9a33c8115b192f69dd1e00a2085564b885c
carrier_bytes: 5798
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-a-new-exemption-a-visible-diff -->
---
instruction_id: make-a-new-exemption-a-visible-diff
title: Make a new exemption a visible diff
summary: "A new exemption is refused unless it is already in the pinned baseline, so adding one is always a reviewable change; a baseline entry that has gone stale is pruned in the same change."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: "A new exemption from a check is about to be added, or a pinned exemption no longer applies."
conditions_does_not_apply_when: The exemption is already in the pinned baseline.
artifact_contract_output_type: exemption-ratchet
artifact_contract_required_data:
  - the exemption marker
  - the pinned baseline it must already be in
  - the stale entries that are pruned
artifact_contract_verified_by: "a new exemption is a visible, reviewable change and the stale entries are pruned with it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/docs-guard-registration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make a new exemption a visible diff
- A brand-new `// docs-guard-exempt:` marker that is not already in the baseline fails the lint, so adding one is always a visible, reviewable diff — not a silent opt-out a test author can add without anyone noticing.
- A baseline entry whose file no longer exists, or no longer carries the marker, is reported stale and must be pruned in the same PR that removes it.
<!-- vpmodule:atom:end make-a-new-exemption-a-visible-diff -->
<!-- vpmodule:atom:begin register-a-test-that-reads-shipped-content-so-it-runs-on-the-change -->
---
instruction_id: register-a-test-that-reads-shipped-content-so-it-runs-on-the-change
title: Register a test that reads shipped content so it runs on the change
summary: "A test that reads shipped prose and asserts on it is registered against the paths it reads, so it runs on the change that breaks it instead of failing later on a shared branch."
capability_tags:
  - build-verification-harness
pattern_tags:
  - test-placement-strategy
conditions_applies_when: A test reads shipped content and asserts on what it says.
conditions_does_not_apply_when: The test only checks that a file exists and never reads its content.
artifact_contract_output_type: guard-registration
artifact_contract_required_data:
  - the paths the test reads
  - the registration entry
  - whether the test asserts on content
artifact_contract_verified_by: the test is registered against the paths it reads and runs on the change that edits them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/docs-guard-registration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Register a test that reads shipped content so it runs on the change
- A test that reads shipped `docs/` content and asserts on it must be registered so it actually runs on the PR that changes those docs — otherwise it can only fail *after* merge, on the shared branch.
- Register the test when it asserts on the **content** of shipped prose — the test would need to change (or would break) if the doc's wording, structure, or specific values changed.
- Exempt the test when it touches `docs/` only incidentally: overlay/fixture input, a path predicate, an existence check with no content assertion, or a scan-exclusion list.
<!-- vpmodule:atom:end register-a-test-that-reads-shipped-content-so-it-runs-on-the-change -->
<!-- vpmodule:atom:begin register-the-wide-pattern-rather-than-a-guessed-narrow-one -->
---
instruction_id: register-the-wide-pattern-rather-than-a-guessed-narrow-one
title: Register the wide pattern rather than a guessed narrow one
summary: "When the path a test reads cannot be pinned down, the registration covers every path rather than a narrow guess; a guess that misses is worse than no registration."
capability_tags:
  - build-verification-harness
pattern_tags:
  - safe-defaults
conditions_applies_when: A test reads content from a path that is computed at runtime or walked recursively.
conditions_does_not_apply_when: The test reads one literal file.
artifact_contract_output_type: guard-pattern
artifact_contract_required_data:
  - the path the test reads
  - the pattern that was registered
  - the consequence of a miss
artifact_contract_verified_by: the registration covers the real path and cannot silently stop running on the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/contributing/docs-guard-registration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Register the wide pattern rather than a guessed narrow one
- When a test's read cannot be pinned to a specific file or directory prefix, register it with `'*'` rather than guessing a narrower pattern.
- A guessed-narrow pattern that misses the actual path is worse than no registration at all: the guard silently stops running on exactly the PR that should have triggered it, and nothing in CI signals the gap — that silent-gap failure mode is the whole defect class this registry exists to prevent.
<!-- vpmodule:atom:end register-the-wide-pattern-rather-than-a-guessed-narrow-one -->