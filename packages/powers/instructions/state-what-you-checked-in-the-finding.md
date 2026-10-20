---
instruction_id: state-what-you-checked-in-the-finding
title: State what you checked in the finding
summary: A finding says what was actually checked and how far the search went; a claim that cannot be grounded is dropped.
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A finding is written about the verification of a change.
conditions_does_not_apply_when: No finding is being written.
artifact_contract_output_type: grounded-finding
artifact_contract_required_data:
  - what was checked
  - how far the search went
  - the finding
artifact_contract_verified_by: every claim in the finding points at something that was read or searched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/finish-an-epic.md
status: active
revision: 2
---

# State what you checked in the finding
Read a test before claiming what it covers, runs, asserts, or misses.
Before claiming no test exists, search the whole repo by the symbol under test and by import references; expected file locations are not enough.
Never assert what you did not verify. If a finding cannot be grounded, drop it.
In a finding, say what you actually checked — "none of the tests I read cover this" — and show how far you looked.
Say a test doesn't exist anywhere only when the symbol/import-reference search actually shows that.
Before writing a finding, re-open the specific tests or search results the finding relies on.
Verify the Demonstration would not make any test you checked fail, or that the absence claim is backed by the symbol/import-reference search.
Explain why the test misses the bug using what the test sets up and checks.
Every finding carries a source reference: a file, a line, a commit, a log. A claim it can't point at doesn't make the report.
It won't invent a root cause or a pattern the code doesn't back up.
