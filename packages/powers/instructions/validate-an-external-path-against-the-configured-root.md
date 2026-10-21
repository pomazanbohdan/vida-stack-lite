---
instruction_id: validate-an-external-path-against-the-configured-root
title: Validate an external path against the configured root
summary: A supplied path is canonicalised and checked against the configured root before it is read; traversal sequences and absolute paths outside the root are rejected.
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A path that comes from the request is used to reach a file.
conditions_does_not_apply_when: The path was produced inside the run and is already known to be inside the root.
artifact_contract_output_type: path-validation
artifact_contract_required_data:
  - the canonicalised path
  - the root it was checked against
  - the rejection reason
artifact_contract_verified_by: no path outside the configured root is ever read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/import.md
status: active
revision: 1
---

# Validate an external path against the configured root
After resolving the scan path and the manifest path relative to the repo root, canonicalize each with realpath (or platform equivalent) and assert the result is under the canonicalised repo root.
Reject absolute paths outside the repo (e.g. `/tmp`, `C:\Windows`) even when they do not contain `..`.
Verify the path does not contain traversal sequences and the file exists:
Canonicalise before you compare.
Traversal sequences are rejected.
