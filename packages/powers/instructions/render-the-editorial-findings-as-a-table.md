---
instruction_id: render-the-editorial-findings-as-a-table
title: Render the editorial findings as a table
summary: "The editorial findings are one table of pass, original text, revised text and changes, ordered by comprehension impact, with the rest rolled into one closing line."
capability_tags:
  - define-output-format
pattern_tags:
  - technical-writing
  - output-formatting
conditions_applies_when: The editorial passes are written up.
conditions_does_not_apply_when: No pass found anything; then the result is stated plainly.
artifact_contract_output_type: editorial-findings-table
artifact_contract_required_data:
  - the table of rows
  - the purpose and audience read
  - the chosen structure model
  - the closing summary
  - the number of fixes left out
artifact_contract_verified_by: "the table carries the four columns, the rows are ordered by impact, and the summary states the reduction and the length target"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/editorial-common.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Render the editorial findings as a table
The editorial lenses render as a findings table rather than the canonical JSON fields. One findings table serves both passes:
| Pass | Original Text | Revised Text | Changes |
Structure rows name the section or passage in **Original Text** and carry the tagged disposition (with move target or condensed rewrite) in **Revised Text**; prose rows quote the exact text and its revision.
Order rows by comprehension impact; when a long document would produce more rows than an author can realistically act on, present the highest-impact rows and roll the rest into one closing line — "N further minor fixes; ask to expand."
Above the table, give the purpose/audience read plus — when the structure pass ran — the chosen structure model.
When the structure pass ran, close with a summary: total recommendations, estimated reduction (words and % of original, computed from the word-metrics counts) if all are accepted, whether a provided length target is met, and any comprehension trade-offs (cuts that sacrifice reader engagement for brevity).
A pass that finds nothing is a valid result; say so.
