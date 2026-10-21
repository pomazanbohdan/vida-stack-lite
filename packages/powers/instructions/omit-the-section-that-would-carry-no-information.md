---
instruction_id: omit-the-section-that-would-carry-no-information
title: Omit the section that would carry no information
summary: "A section whose every entry is empty is not emitted at all; an all-empty table is noise, and a zero count is not worth a line."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A report contains a section whose entries may all be empty or zero.
conditions_does_not_apply_when: The section always carries at least one real entry.
artifact_contract_output_type: report-body
artifact_contract_required_data:
  - the section
  - the entries that carry a real value
  - the decision to emit or omit
artifact_contract_verified_by: the section is emitted only when it carries at least one real value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/stats.md
status: active
revision: 1
---

# Omit the section that would carry no information
**Self-suppress when every commit is missing (#2431):** the execute pipeline only writes `gate-status:` trailers when TDD mode is active.
If every commit in the scan normalizes to `missing`, skip this section and the aggregate trailer (step 9) entirely — a 100%-missing table is pure noise.
Only emit when at least one commit carries a real value (`skill`, `fallback`, or `exempt`).
If `MVP_COUNT == 0`, the project has no MVP-mode phases — omit the line (no clutter for non-MVP projects).
