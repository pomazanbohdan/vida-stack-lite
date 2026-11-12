---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-set-up-cross-ai-review-md-54d6533a-c01"
title: "gsd-core: docs/how-to/set-up-cross-ai-review.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/set-up-cross-ai-review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/set-up-cross-ai-review.md\"}"
atom_ids:
  - start-with-the-consensus-summary
  - stop-the-convergence-loop-when-the-concern-count-stops-falling
  - use-independent-reviewers-because-their-blind-spots-differ
atom_count: 3
atoms: "[{\"atom_id\":\"start-with-the-consensus-summary\",\"file_sha256\":\"b2eff2b5496ab34dbc44e61265dfb991047a154ed92187d846ee3434d2fdfd85\",\"content_sha256\":\"16458733b126999143cdc25599470b723f1a2c9ad8d4d8adeb5eb6c705fa223a\",\"file_bytes\":1295,\"body_bytes\":238},{\"atom_id\":\"stop-the-convergence-loop-when-the-concern-count-stops-falling\",\"file_sha256\":\"82990c8fc963597a08f647a172525844427731da9265b45be8e395ddf1d9b59c\",\"content_sha256\":\"05df486efffc4f8e1f40ec995e273b801468f86c048dca1fa83a688349f65753\",\"file_bytes\":1470,\"body_bytes\":351},{\"atom_id\":\"use-independent-reviewers-because-their-blind-spots-differ\",\"file_sha256\":\"e32f54a723f1701c761158f487d37a13fb6933fff0fb0db7e1a9cd9e92021b36\",\"content_sha256\":\"3c3dd6f65e72e93726f73ded0e5013b755fe5a65bc241dd04b7ce20c6b12e918\",\"file_bytes\":1380,\"body_bytes\":275}]"
carrier_sha256: b4b4c169c0ac13dcceb354ca54ea1f6d0d4f031bc489b682c565ccbb3f1a2a04
carrier_bytes: 4622
revision: 1
status: active
---
<!-- vpmodule:atom:begin start-with-the-consensus-summary -->
---
instruction_id: start-with-the-consensus-summary
title: Start with the consensus summary
summary: The consensus section carries the signal two or more reviewers agree on; the divergent section carries where they disagreed.
capability_tags:
  - review-code
pattern_tags:
  - report-triage
conditions_applies_when: The review output of several reviewers is read.
conditions_does_not_apply_when: A single reviewer produced the output.
artifact_contract_output_type: review-output-triage
artifact_contract_required_data:
  - the concerns two or more reviewers raised
  - the areas the reviewers disagreed on
artifact_contract_verified_by: the consensus and the divergence are both read before the findings are acted on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Start with the consensus summary
A **Consensus Summary** section that synthesises concerns raised by two or more reviewers — start here for the highest-priority signal
A **Divergent Views** section for areas where reviewers disagreed
<!-- vpmodule:atom:end start-with-the-consensus-summary -->
<!-- vpmodule:atom:begin stop-the-convergence-loop-when-the-concern-count-stops-falling -->
---
instruction_id: stop-the-convergence-loop-when-the-concern-count-stops-falling
title: Stop the convergence loop when the concern count stops falling
summary: "The loop ends when the Critical-concern count reaches zero, and a count that stops falling is a stall the run reports."
capability_tags:
  - review-code
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A review and replan loop runs until the concerns are closed.
conditions_does_not_apply_when: A single review round is enough.
artifact_contract_output_type: convergence-verdict
artifact_contract_required_data:
  - the concern count per cycle
  - the state the loop ended in
artifact_contract_verified_by: "the loop ended on a zero count, a stall warning or an escalation, and the state is named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop the convergence loop when the concern count stops falling
The loop exits when the Critical-concern count reaches zero.
**Stall detection:** if the Critical-concern count is not decreasing across cycles, the run warns you.
When the cycle cap is reached with open Critical concerns, an escalation gate asks whether to proceed or review manually.
<!-- vpmodule:atom:end stop-the-convergence-loop-when-the-concern-count-stops-falling -->
<!-- vpmodule:atom:begin use-independent-reviewers-because-their-blind-spots-differ -->
---
instruction_id: use-independent-reviewers-because-their-blind-spots-differ
title: Use independent reviewers because their blind spots differ
summary: "Reviewers run the same prompt independently; different models miss different things, so consensus catches more than one reviewer."
capability_tags:
  - review-code
pattern_tags:
  - multi-voice-delivery
conditions_applies_when: Several reviewers are available for a review.
conditions_does_not_apply_when: A single reviewer is the only option.
artifact_contract_output_type: multi-reviewer-run
artifact_contract_required_data:
  - the reviewers that ran
  - the feedback each of them produced
artifact_contract_verified_by: each reviewer ran the same prompt independently and its feedback is reported separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Use independent reviewers because their blind spots differ
Each reviewer runs the same structured prompt against your `PLAN.md` files independently.
Because different models have different blind spots, multi-reviewer consensus catches more issues than any single reviewer.
<!-- vpmodule:atom:end use-independent-reviewers-because-their-blind-spots-differ -->