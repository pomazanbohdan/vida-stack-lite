---
instruction_id: show-the-scoring-not-just-the-total
title: "Show the scoring, not just the total"
summary: "The verdict shows the weighted matrix so it can be re-weighted, names the pick, the runner-up and the conditions under which the runner-up wins, and offers the cheapest hedge; the comparison holds for any research type."
capability_tags:
  - design-experiments
pattern_tags:
  - decision-trail
conditions_applies_when: A verdict between candidates is about to be stated.
conditions_does_not_apply_when: The candidates were scored on a single criterion.
artifact_contract_output_type: selection-verdict
artifact_contract_required_data:
  - the weighted matrix
  - the pick
  - the runner-up and its conditions
  - the reversibility hedge
artifact_contract_verified_by: the scoring is shown and the runner-up with its winning conditions is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/selection.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/research.md
status: active
revision: 2
---

# Show the scoring, not just the total
- **Verdict.** The weighted decision matrix — show the scoring, not just totals; a matrix the user can re-weight is worth more than a verdict they must trust. Then: the pick; the named runner-up and the conditions under which it wins instead; the strongest argument against the pick (from the red-team pass when it ran); the cheapest reversibility hedge (abstraction seam, pilot scope, exit test).
'Help me choose between A and B' works with any research type. It agrees the requirements first and ends with a pick, a runner-up, and the strongest argument against the pick.
