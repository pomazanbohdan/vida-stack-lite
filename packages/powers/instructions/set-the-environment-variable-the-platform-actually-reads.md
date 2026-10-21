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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 1
---

# Set the environment variable the platform actually reads
- Windows uses `USERPROFILE` as the home directory environment variable, not `HOME`.
- Per Node's own docs, `os.tmpdir()` on Windows consults `TEMP` then `TMP` — it never reads `TMPDIR` there.
- Whenever a test sets `process.env.HOME`, it must also set `process.env.USERPROFILE` to the same value
