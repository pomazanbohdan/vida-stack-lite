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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/docs-guard-registration.md
status: active
revision: 1
---

# Register the wide pattern rather than a guessed narrow one
- When a test's read cannot be pinned to a specific file or directory prefix, register it with `'*'` rather than guessing a narrower pattern.
- A guessed-narrow pattern that misses the actual path is worse than no registration at all: the guard silently stops running on exactly the PR that should have triggered it, and nothing in CI signals the gap — that silent-gap failure mode is the whole defect class this registry exists to prevent.
