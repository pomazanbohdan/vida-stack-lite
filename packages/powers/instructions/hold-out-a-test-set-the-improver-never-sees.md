---
instruction_id: hold-out-a-test-set-the-improver-never-sees
title: Hold out a test set the improver never sees
summary: "Split the queries 60/40, keep the split fixed across the rounds, hide the test half from the improver, and pick the winner on the test score."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A loop rewrites something against a labelled set of cases.
conditions_does_not_apply_when: There is one case and no set to split.
artifact_contract_output_type: held-out-evaluation
artifact_contract_required_data:
  - the split and its stratification
  - the train and test scores per round
  - the winner
artifact_contract_verified_by: the improver saw only the train half and the winner was chosen on the test score
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/description-optimization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Hold out a test set the improver never sees
Split the queries into a train set and a test set, 60 percent train and 40 percent test, stratified so the should and should-not ratio is preserved in both halves.
Stratifying matters because an unstratified split can land most of the should-not queries in one half and leave the improver blind to the false-positive problem on train, or leave the test set unable to detect it.
The split is fixed once at the start of the loop and never reshuffled between rounds, because reshuffling would let a query that exposed a weakness in one round hide in the train set the next.
The improver works only from the train set. It never sees the test queries, their labels, or the test score, which is what keeps the loop honest.
Score train and test separately. The train score and its per-query verdicts are what the improver sees; the test score is recorded but withheld.
After the rounds finish, pick the description with the best test score, not the best train score.
Train measures how well the improver fixed the failures it could see; test measures whether that fix generalizes to queries it never saw, which is the only thing that matters in production.
When two rounds tie on test, prefer the one with the better train score as the tiebreaker, and failing that the shorter, sharper description.
