---
instruction_id: the-silent-case-still-needs-a-look
title: The silent case still needs a look
summary: A degraded case that produces no warning is still a degraded case; the absence of the warning is not evidence that the input was clean.
capability_tags:
  - debug-root-cause
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A run behaves as though an input was missing and no warning was printed.
conditions_does_not_apply_when: A warning was printed.
artifact_contract_output_type: diagnosis
artifact_contract_required_data:
  - the file that was inspected
  - what was found in it
artifact_contract_verified_by: the input was inspected even though nothing warned about it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/debug-a-failed-execution.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# The silent case still needs a look
**A file can still be truncated without this warning.** GSD stays silent when the partial block carries fewer than two fields, or when the text after the opening `---` reads as prose rather than frontmatter, because a Markdown document that opens with a horizontal rule is indistinguishable from one of those. If a run behaves as though metadata is missing and you see no warning, inspect the file anyway.
