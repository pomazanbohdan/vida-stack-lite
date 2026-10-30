---
instruction_id: keep-the-curation-idempotent-scoped-and-non-destructive
title: "Keep the curation idempotent, scoped and non-destructive"
summary: "The memory write never fails the run, never leaves the project's own scope, never duplicates and never destroys history."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A memory store is written at the end of a piece of work.
conditions_does_not_apply_when: The write is the deliverable itself.
artifact_contract_output_type: curation-report
artifact_contract_required_data:
  - what was written
  - what was skipped
artifact_contract_verified_by: a rerun would not duplicate anything and nothing outside the scope was touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-mempalace-curator.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-mempalace-curator.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the curation idempotent, scoped and non-destructive
If neither is reachable, report unavailability and stop — do not error.
Best-effort only: catch and report every memory-store failure; never propagate an error that would fail the ship step.
Wing-scoped only: never read, write, or prune outside this project's wing.
Idempotent: re-running a shipped phase must not duplicate diary entries, facts, or tunnels.
Verbatim preservation: invalidate superseded facts (set `valid_to`); do not destroy history.
