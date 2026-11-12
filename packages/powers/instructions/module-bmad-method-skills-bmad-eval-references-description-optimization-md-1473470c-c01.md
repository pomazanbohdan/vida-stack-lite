---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-eval-references-description-optimization-md-1473470c-c01"
title: "bmad-method: skills/bmad-eval/references/description-optimization.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-eval/references/description-optimization.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-eval/references/description-optimization.md\"}"
atom_ids:
  - feed-the-failed-attempts-back-into-the-loop
  - hold-out-a-test-set-the-improver-never-sees
  - make-the-negative-query-a-near-miss
atom_count: 3
atoms: "[{\"atom_id\":\"feed-the-failed-attempts-back-into-the-loop\",\"file_sha256\":\"1180392cc739e64aadc7a916b22db015ba9cd629760d07a198f97b29ed3c5532\",\"content_sha256\":\"07854e55b01fdcecc1479a658ac1141d4a966aef9df53d5f565109f41e46b330\",\"file_bytes\":1902,\"body_bytes\":792},{\"atom_id\":\"hold-out-a-test-set-the-improver-never-sees\",\"file_sha256\":\"9639675ba2802449fda0342157705e4567b67ea43d07192c3e02909168913a1f\",\"content_sha256\":\"5763c3c9a7652770b6475ccbe0c9c6a74847df11e773cc1281329eab06de7866\",\"file_bytes\":2482,\"body_bytes\":1338},{\"atom_id\":\"make-the-negative-query-a-near-miss\",\"file_sha256\":\"b99ba63b56ede32dcc04fd4fa5142a933cc8ff755bec8e1940d28e57a23603b5\",\"content_sha256\":\"6cd0b4c6cf653054a55f9851e95902de34234ec33b11ab60851495595437df06\",\"file_bytes\":2060,\"body_bytes\":844}]"
carrier_sha256: 251adfd26d89c8d5fad5fadfa27f4075c0335e1fcaecda87f3c6fbfb3f8551d1
carrier_bytes: 6859
revision: 1
status: active
---
<!-- vpmodule:atom:begin feed-the-failed-attempts-back-into-the-loop -->
---
instruction_id: feed-the-failed-attempts-back-into-the-loop
title: Feed the failed attempts back into the loop
summary: "Hand the improver the attempts it already made and why each fell short, so it tries a structurally different cut instead of nudging the same wording."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A loop rewrites a description or an instruction over several rounds.
conditions_does_not_apply_when: Only one attempt exists.
artifact_contract_output_type: attempt-history
artifact_contract_required_data:
  - the earlier attempts
  - why each of them fell short
artifact_contract_verified_by: the next attempt differs structurally from the ones that failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/description-optimization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Feed the failed attempts back into the loop
Also hand the improver the descriptions it already tried and why each fell short, so it tries something structurally different rather than nudging the same wording round after round.
Without this, the loop tends to oscillate between two phrasings that each fix one failure and reintroduce the other.
Feeding the history back pushes the improver toward a different cut of the boundary: reframing around intent instead of keywords, naming the adjacent skill the near misses belong to, or moving a qualifier from the trigger clause into the body.
Keep the description within whatever length and format bounds the runtime enforces (character cap, no angle brackets, and so on); a rewrite that triggers well but violates the bound is not a candidate.
<!-- vpmodule:atom:end feed-the-failed-attempts-back-into-the-loop -->
<!-- vpmodule:atom:begin hold-out-a-test-set-the-improver-never-sees -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/description-optimization.md
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
<!-- vpmodule:atom:end hold-out-a-test-set-the-improver-never-sees -->
<!-- vpmodule:atom:begin make-the-negative-query-a-near-miss -->
---
instruction_id: make-the-negative-query-a-near-miss
title: Make the negative query a near miss
summary: "The should-not queries share keywords, domain and phrasing with the should queries, because the signal lives in the pairs a careless reader would lump together."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The set of queries that must not route to a skill is written.
conditions_does_not_apply_when: The set exists already and is only being run.
artifact_contract_output_type: negative-query-set
artifact_contract_required_data:
  - the near-miss pairs
  - the wording shared by each pair
artifact_contract_verified_by: each negative query shares vocabulary with a positive one that a careless reader would lump together
compatibility_excludes: []
compatibility_requires:
  - pair-each-negative-trigger-with-the-sibling-that-owns-it
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/description-optimization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Make the negative query a near miss
Generate about twenty near-miss queries, roughly half that should trigger the skill and half that should not.
The signal lives in the near misses, so make the should-not queries share keywords, domain, and phrasing with the should queries.
A should-not query that obviously belongs to another skill teaches the description nothing, because any wording already handles it.
The pairs that matter are the ones a careless reader would lump together: a request to build a workflow versus a request to debug an existing one, a request to write a brief versus a request to critique a brief someone already wrote.
Aim for variety in surface form (casual speech, a pasted error, a one-line ask, a paragraph of context) so the description is tested against the shapes real requests arrive in, not one tidy template.
<!-- vpmodule:atom:end make-the-negative-query-a-near-miss -->