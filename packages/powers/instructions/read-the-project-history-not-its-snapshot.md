---
instruction_id: read-the-project-history-not-its-snapshot
title: "Read the project history, not its snapshot"
summary: "Read a project's metrics over time and its issue tracker, never a snapshot: the tracker shows the gap between the docs and the reality."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: "The health, the adoption or the direction of a project is to be established."
conditions_does_not_apply_when: The project has no issue tracker and no metric history.
artifact_contract_output_type: project-history
artifact_contract_required_data:
  - the metric history read
  - the issues read
  - the gap between the docs and the reality
artifact_contract_verified_by: every claim names the metric series or the issue it rests on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/technical.md
status: active
revision: 1
---

# Read the project history, not its snapshot
read repository metrics over time, never snapshots
issue trackers reveal the gap between docs and reality
