---
instruction_id: classify-a-check-result-by-its-severity-not-by-its-marker
title: "Classify a check result by its severity, not by its marker"
summary: "A checker result is read entry by entry: the entries decide the outcome, a missing or unknown severity counts as Critical, and Minor entries never block."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A check returned a result that has to be classified.
conditions_does_not_apply_when: The check returned a plain pass with no entries.
artifact_contract_output_type: severity-classification
artifact_contract_required_data:
  - the count of the Critical and Important entries
  - the count of the Minor entries
  - the resulting outcome
artifact_contract_verified_by: "the outcome follows the entries, and an unrecognised severity counts as Critical"
compatibility_excludes: []
compatibility_requires:
  - state-the-severity-of-the-defect
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/import.md
status: active
revision: 1
---

# Classify a check result by its severity, not by its marker
Handle the checker return by severity, never by the sentinel alone:
count the entries in the issues block.
an entry whose severity is missing or unrecognized
counts as Critical (fail closed).
Critical: blocks the write.
Important: needs confirmation.
Minor: advisory and never blocks.
