---
instruction_id: check-removed-code-for-a-contract-it-carried
title: Check removed code for a contract it carried
summary: Every chunk of removed code is asked whether it carried a behaviour or a contract that the change neither re-established nor retired on purpose.
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: The change removed or replaced code.
conditions_does_not_apply_when: The change removed nothing but renames and whitespace.
artifact_contract_output_type: deletion-findings
artifact_contract_required_data:
  - the removed item
  - the behaviour or contract it enforced
  - the regression or orphan
artifact_contract_verified_by: every removed chunk was asked what it carried
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/references/deletion-check.md
status: active
revision: 1
---

# Check removed code for a contract it carried
Secondary pass for the Edge Case Hunter — runs only when the diff removed meaningful code. Subordinate to the edge-case pass; findings are usually few or none.
For each chunk of removed or replaced code (ignore pure renames and whitespace), ask: did it carry behavior or a contract that the change neither re-established nor intentionally retired?
Add a finding for any resulting regression, orphaned reference, or newly-dead code.
Skip anything already covered by your edge-case findings.
these are inferences; rate them
Add nothing if nothing qualifies.
