---
instruction_id: read-the-source-of-truth-file-before-you-quote-an-in-repo-value
title: Read the source-of-truth file before you quote an in-repo value
summary: "A value that exists in the repository is quoted from the file that defines it, with the path, the lines and the value itself."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A constant, a type, an error code or a path from the repository is quoted."
conditions_does_not_apply_when: The value comes from an external document.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the value
  - the path
  - the line range
artifact_contract_verified_by: the value is quoted verbatim next to the path and the lines that define it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# Read the source-of-truth file before you quote an in-repo value
A codebase `grep` is not sufficient on its own: it confirms a string occurs, not that you read the definition.
Cite the path **and line range** (`[VERIFIED: src/types/order.ts:14-22]`), and quote the values **verbatim** in RESEARCH.md beside the claim — paraphrase is forbidden.
Every value appearing in a code example or skeleton must also appear in that verbatim quote; a value that does not is `[ASSUMED]`.
Training memory and a web search are not substitutes for reading the file
