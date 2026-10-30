---
instruction_id: the-manifest-is-authoritative-over-the-heuristic
title: The manifest is authoritative over the heuristic
summary: "A supplied manifest decides what is in scope and what type each item has; the directory conventions only run when there is no manifest, and the union of the two is de-duplicated."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: A set of documents has to be collected and classified.
conditions_does_not_apply_when: The set of documents was given as an explicit list of files.
artifact_contract_output_type: scoped-input-set
artifact_contract_required_data:
  - the entries and their types
  - the source each entry came from
  - the de-duplicated set
artifact_contract_verified_by: the manifest decides the set and each file appears exactly once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# The manifest is authoritative over the heuristic
1. Manifest (if provided) — authoritative:
2. Directory conventions (skipped when manifest is provided):
De-duplicate the union (a file matched by multiple patterns is one doc).
Each entry provides `path` (required, relative to repo root) + `type` (required, one of ADR|PRD|SPEC|DOC) + `precedence` (optional integer).
Content heuristics (run during classification, not here) — the classifier handles frontmatter `type:` and H1 inspection for docs that didn't match a convention.
