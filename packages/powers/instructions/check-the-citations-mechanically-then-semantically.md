---
instruction_id: check-the-citations-mechanically-then-semantically
title: "Check the citations mechanically, then semantically"
summary: "The markers are diffed against the source table mechanically, and a fresh-context reader then judges whether each cited source says what the text claims."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A finished report is about to be delivered.
conditions_does_not_apply_when: The text carries no citations.
artifact_contract_output_type: citation-check
artifact_contract_required_data:
  - the dangling markers and orphaned rows
  - the semantic verdicts
  - the downgraded claims
artifact_contract_verified_by: every marker resolves and every claim whose source does not back it is downgraded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/finalize.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Check the citations mechanically, then semantically
**Citation check — mechanical, then semantic.**
- it diffs inline `[n]` markers against the appendix and lists dangling markers and orphaned rows exactly; fix what it reports.
Then a fresh-context subagent does only the judgment half: does each cited source actually say what the text claims? It never rewrites findings — a claim whose source doesn’t back it gets its confidence downgraded and the mismatch logged as an `event`.
