---
instruction_id: go-to-the-upstream-documentation-when-the-local-help-runs-out
title: Go to the upstream documentation when the local help runs out
summary: "When the help document, its topic files and the installed skills cannot answer the question, the documentation site is fetched, and the source repository it links to is the final authority on how anything actually behaves."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "The local help, its topic files and the installed skills cannot answer the question."
conditions_does_not_apply_when: One of the local sources can answer the question.
artifact_contract_output_type: upstream-answer
artifact_contract_required_data:
  - the sources that were exhausted
  - the documentation page that answers the question
  - the upstream source that is the final authority
artifact_contract_verified_by: the answer is taken from the upstream documentation and names the source it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/research-documentation-lookup.md
status: active
revision: 2
---

# Go to the upstream documentation when the local help runs out
This document, its topic files, and the installed skills cannot answer,
fetch the documentation site
and follow the pages relevant to the question.
The source repository it links to is the final authority on how anything actually behaves.

Do not skip documentation lookups because MCP tools are unavailable - the CLI fallback works and produces equivalent output.
