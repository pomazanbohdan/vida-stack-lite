---
instruction_id: quote-only-the-behavioral-signal-and-attribute-every-quote
title: Quote only the behavioral signal and attribute every quote
summary: A quote is trimmed to the part that shows the pattern and always carries the project it came from.
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: A quote from a source is put into an analysis.
conditions_does_not_apply_when: The text is not a quotation.
artifact_contract_output_type: quoted-evidence
artifact_contract_required_data:
  - the quote
  - the signal it demonstrates
  - the project it came from
artifact_contract_verified_by: every quote is trimmed to about a hundred characters and names its project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/user-profiling.md
status: active
revision: 1
---

# Quote only the behavioral signal and attribute every quote
Trim quotes to the behavioral signal -- the part that demonstrates the pattern
Target approximately 100 characters per quote
Preserve the meaningful fragment, not the full message
If the signal is in the middle of a long message, use "..." to indicate trimming
Never include the full 500-character message when 50 characters capture the signal
Every evidence quote must include the project name
Project attribution enables verification and shows cross-project patterns
