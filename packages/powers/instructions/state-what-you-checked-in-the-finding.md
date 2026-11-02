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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/finish-an-epic.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/few-shot-examples/verifier.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
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
No individual must-have is listed or checked. No file paths, no line numbers, no grep output, no level-by-level breakdown.
The verifier restated the must-haves as passing without showing any evidence.
