---
instruction_id: suppress-a-section-with-no-entries
title: Suppress a section with no entries
summary: "A section that has no entries is left out; an empty heading reads as a claim that nothing fell into it, and an outcome where everything landed in one bucket is stated in one line."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A report has sections that may end up empty.
conditions_does_not_apply_when: Every section is known to hold at least one entry.
artifact_contract_output_type: report-with-no-empty-sections
artifact_contract_required_data:
  - the sections that were written
  - the sections that were suppressed
artifact_contract_verified_by: no empty heading appears in the report and a fully empty result is stated in one line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 1
---

# Suppress a section with no entries
Suppress any section with no entries — an empty heading reads as a claim that nothing fell into it.
If **every** finding landed in Unresolved, say so in one line rather than presenting an empty admitted section: that outcome is itself the useful signal.
