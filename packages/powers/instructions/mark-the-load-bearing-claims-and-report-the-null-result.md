---
instruction_id: mark-the-load-bearing-claims-and-report-the-null-result
title: Mark the load-bearing claims and report the null result
summary: "The claims the answer rests on are marked load-bearing for the verifiers, both patterns that do the same thing are reported unranked, and what was searched for and not found is reported too."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A digest is being written from a search.
conditions_does_not_apply_when: The search found the answer immediately and nothing was looked for.
artifact_contract_output_type: search-digest
artifact_contract_required_data:
  - the load-bearing claims
  - both patterns doing the same thing
  - what was searched for and not found
artifact_contract_verified_by: the load-bearing claims are marked and the empty searches are reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-analyzer.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-locator.md
status: active
revision: 1
---

# Mark the load-bearing claims and report the null result
- the few the answer rests on marked load-bearing, since verifiers re-check each of those
- two patterns that do the same thing both reported, unranked
- then what you looked for and did not find, as the search and the commit.
- a directory full of matches as a count and one cited hit
