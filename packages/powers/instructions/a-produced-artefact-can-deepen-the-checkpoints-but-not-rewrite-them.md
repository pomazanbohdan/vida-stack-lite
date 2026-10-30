---
instruction_id: a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them
title: A produced artefact can deepen the checkpoints but not rewrite them
summary: "The checkpoints that another step produced are merged into the list and never subtracted from it, and a name that could reach outside the working area is refused before it is resolved."
capability_tags:
  - verify-work-results
pattern_tags:
  - defense-in-depth
conditions_applies_when: Another step in the same run produced a list of checkpoints that could be merged into the test list.
conditions_does_not_apply_when: No other step produced anything.
artifact_contract_output_type: merged-checkpoints
artifact_contract_required_data:
  - the produced entries
  - the merged list
  - the refused names
artifact_contract_verified_by: the merged list only grew and the earlier wording of a checkpoint was never rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# A produced artefact can deepen the checkpoints but not rewrite them
Merged entries are added to, never subtracted from, what `coverage:` classification and the prose fallback produce.
Deduplicate against already-derived checkpoints by `name`, keeping the earlier entry's `expected` text so a produced artefact cannot silently rewrite a criterion.
A name with no artefact on disk means that step was inactive, skipped, or failed. Note it to the user and derive normally — **never drop a deliverable and never block UAT over it.**
A name carrying `/`, `..`, a leading `-`, a leading path separator, or any shell metacharacter is a malformed manifest: record a warning, skip that name, continue.
Only a validated name is resolved, and only against what the step wrote inside
