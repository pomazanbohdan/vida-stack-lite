---
instruction_id: revise-the-description-from-the-failures-not-the-queries
title: "Revise the description from the failures, not from the queries"
summary: "When an evaluation comes back with failures, change the situations and the boundaries that produced them, never paste the failed query's words into the description, and prove the rewrite on a held-out set."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger evaluation came back with failures.
conditions_does_not_apply_when: The skill has never been evaluated.
artifact_contract_output_type: skill-description
artifact_contract_required_data:
  - the failing queries
  - the situation or boundary that changed
  - the held-out set
artifact_contract_verified_by: "the revised description fixes the failure and no query's wording appears in it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-description.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Revise the description from the failures, not from the queries
A trigger eval runs a set of queries through the real runtime and records whether the skill loaded.
A description is revised from eval failures by changing its situations and boundaries, never by pasting a failed query's words into it.
A bounded optimization loop that improves the description against a held-out test set so the rewrite does not overfit to the cases it is graded on.
