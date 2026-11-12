---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-design-verifier-reach-md-7020490a-c01"
title: "gsd-core: docs/design/verifier-reach.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/design/verifier-reach.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/design/verifier-reach.md\"}"
atom_ids:
  - abstain-and-flag-instead-of-guessing
  - grade-against-the-explicit-predicates-never-a-restated-goal
  - widen-the-spec-not-the-verifier
atom_count: 3
atoms: "[{\"atom_id\":\"abstain-and-flag-instead-of-guessing\",\"file_sha256\":\"3e9b421ae6a0c2244868bde9de6a65f724edd24ee73e233aafc465c2ffa91b90\",\"content_sha256\":\"9416fe31c84736095b6d5edc904e18d1bd8c5b7549bfc43acea45349d381f77d\",\"file_bytes\":1417,\"body_bytes\":291},{\"atom_id\":\"grade-against-the-explicit-predicates-never-a-restated-goal\",\"file_sha256\":\"6dfa9e46bba9f6953ce43c347ac1b9051d50e07d6e6c26c23c1a59653ffaf632\",\"content_sha256\":\"46799de1348941637848761afb72b1667e462fb44638dab794be5abbb317e44e\",\"file_bytes\":1590,\"body_bytes\":425},{\"atom_id\":\"widen-the-spec-not-the-verifier\",\"file_sha256\":\"fd1f53acb385ecea73afc80a491efcc43cbfb9432414d44617ee0f1e20fe0133\",\"content_sha256\":\"cb714f9c2f19a91f2e628619aa61855c69472a8404d76f9721e904d44b19df16\",\"file_bytes\":1518,\"body_bytes\":353}]"
carrier_sha256: 424df1d2687771e0a1c47a94932c2af507f51878c872260959c8d4228e4ae82b
carrier_bytes: 4950
revision: 1
status: active
---
<!-- vpmodule:atom:begin abstain-and-flag-instead-of-guessing -->
---
instruction_id: abstain-and-flag-instead-of-guessing
title: Abstain and flag instead of guessing
summary: A case that cannot be decided from the evidence is recorded as unverified and handed to a human; it is never passed and never turned into a halt of the whole run.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A check reaches a case that cannot be settled from the evidence.
conditions_does_not_apply_when: The check can settle every case it reaches.
artifact_contract_output_type: abstention
artifact_contract_required_data:
  - the irreducible case
  - the flag that is emitted
  - where the case is routed
artifact_contract_verified_by: the case is flagged for a human and neither passed nor turned into a halt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/design/verifier-reach.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Abstain and flag instead of guessing
- The only honest move on an irreducible case is **abstain-and-flag**, not a higher bar.
- Never a silent pass; never a hard halt of an AFK run.
- record a non-authoritative LLM-judge verdict and emit an "unverified — human review recommended" flag.
<!-- vpmodule:atom:end abstain-and-flag-instead-of-guessing -->
<!-- vpmodule:atom:begin grade-against-the-explicit-predicates-never-a-restated-goal -->
---
instruction_id: grade-against-the-explicit-predicates-never-a-restated-goal
title: "Grade against the explicit predicates, never a restated goal"
summary: "A grading step is measured against the predicates the specification states, not against a goal the grader restates for itself."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Something grades the work against a goal.
conditions_does_not_apply_when: The goal itself is what is being written and there is no predicate to grade against yet.
artifact_contract_output_type: grading-basis
artifact_contract_required_data:
  - the explicit predicates
  - the restatement that is not used
  - the source of the grading signal
artifact_contract_verified_by: the grading ran against the explicit predicates and not a restated goal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/design/verifier-reach.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Grade against the explicit predicates, never a restated goal
- Grading must be **against the spec's explicit predicates**, never a self-restatement.
- **Do not** let the verifier grade a restated goal; grade against explicit predicates (test-tier checks, judgment-tier flags).
- Confidence-gating cannot rescue this: the model is ~0.93-confident and wrong, so there is no threshold that separates its hits from its misses.
<!-- vpmodule:atom:end grade-against-the-explicit-predicates-never-a-restated-goal -->
<!-- vpmodule:atom:begin widen-the-spec-not-the-verifier -->
---
instruction_id: widen-the-spec-not-the-verifier
title: "Widen the spec, not the verifier"
summary: "A verifier can only check assertions that exist, so reliability is raised by writing the missing requirement down, not by tightening the check."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check misses a defect and the question is where to add the leverage.
conditions_does_not_apply_when: The defect is covered by a requirement that was written down.
artifact_contract_output_type: reach-decision
artifact_contract_required_data:
  - the assertion that is missing
  - the requirement it should come from
  - where the leverage is put
artifact_contract_verified_by: the missing requirement was written down rather than the check being sharpened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/design/verifier-reach.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - product
---

# Widen the spec, not the verifier
- **A goal-backward verifier can only check assertions that exist.**
- The conclusion is structural: reliability is **not** a verifier-tuning problem.
- The verifier is fine *when the predicate exists*; it fails when the predicate was never written.
- So the leverage is upstream — make the missing predicate exist.
<!-- vpmodule:atom:end widen-the-spec-not-the-verifier -->