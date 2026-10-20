---
instruction_id: record-the-decisions-found-last
title: "Record the decisions found, last"
summary: "A decision found in the history is recorded last, and only when there is one: the decision, its commit and pull request, the rationale found there, how the three tests are met, and the proposed decision-record path."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The research found a decision in the history of the codebase.
conditions_does_not_apply_when: The research found no decision; the section is dropped.
artifact_contract_output_type: decision-record
artifact_contract_required_data:
  - the decision
  - its commit and pull request
  - the rationale found there
  - how each of the three tests is met
  - the proposed decision-record path
artifact_contract_verified_by: "the section names the commit, the pull request, the rationale and the proposed path"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# Record the decisions found, last
`## Decisions found`, last and only when there is one: for each, the decision, its commit and pull request, the rationale found there, how each of the three tests is met, shown from the history, and the proposed ADR path
