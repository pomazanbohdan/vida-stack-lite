---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-review-convergence-md-fc6aada3-c01"
title: "gsd-core: gsd-core/workflows/plan-review-convergence.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/plan-review-convergence.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-review-convergence.md\"}"
atom_ids:
  - a-blocker-cannot-be-accepted
  - a-loop-that-does-not-change-the-input-cannot-converge
  - corroborate-a-single-reviewer-finding-by-its-claim-type
  - derive-the-reviewer-selection-from-the-roster
  - fail-closed-on-an-unreadable-gate
  - flag-only-contradictions-not-restatements
  - ground-every-cited-symbol-in-the-source
  - let-only-the-owner-write-the-slot
atom_count: 8
atoms: "[{\"atom_id\":\"a-blocker-cannot-be-accepted\",\"file_sha256\":\"fa5aa9e5236155662a17d71616f72b6cb3dbade1338090b5c3c79b361196a71e\",\"content_sha256\":\"1ddda09be33bbfce6d967f860186e1cf4d0194882257668175e92bdfeadf8b6b\",\"file_bytes\":1270,\"body_bytes\":259},{\"atom_id\":\"a-loop-that-does-not-change-the-input-cannot-converge\",\"file_sha256\":\"2d9f6db1a09f0d2cbd962cd8f896e8d004783999c5b5326cc67f16ab9664fdb7\",\"content_sha256\":\"4038f135eca4666086686846cd5d41e535a1c6385e9053189fe21202b06b69e5\",\"file_bytes\":1587,\"body_bytes\":318},{\"atom_id\":\"corroborate-a-single-reviewer-finding-by-its-claim-type\",\"file_sha256\":\"78b96e2c8851d5beec48ff6a0e838cfc714d9264b9267d35d0a6cc06d9cb7813\",\"content_sha256\":\"7e199141fe8b9f2c2a5edc123631d98db2f7adfec1c58ddab61f01bec92728a2\",\"file_bytes\":2057,\"body_bytes\":826},{\"atom_id\":\"derive-the-reviewer-selection-from-the-roster\",\"file_sha256\":\"680adfa24105f0bf06c614f5af34c0a30dcfc7347f3e9d535b92cede942a89a3\",\"content_sha256\":\"12933d5480c73cd7d76a08fc31bbf72b189f28ea951e860383854c9612041b35\",\"file_bytes\":1255,\"body_bytes\":156},{\"atom_id\":\"fail-closed-on-an-unreadable-gate\",\"file_sha256\":\"69e01788ee538ffcffdfa0fb99fe242507b1dcecee97cd3b75956989da0aefdc\",\"content_sha256\":\"44d184da94143490e90f1109fc414482adffdc69417b1ffb79fe314894fc4b6f\",\"file_bytes\":1214,\"body_bytes\":174},{\"atom_id\":\"flag-only-contradictions-not-restatements\",\"file_sha256\":\"92d85ff1a456a57b7ac0d6acceda4c9aa6a4e94116e744888ffc7eb835415edc\",\"content_sha256\":\"13e945d2a71ad8631c1a14236850cd9feda2e7d7934590bacc27b3d84df03627\",\"file_bytes\":1580,\"body_bytes\":526},{\"atom_id\":\"ground-every-cited-symbol-in-the-source\",\"file_sha256\":\"9b5a2475ddfb229d1612a81393ccf6ccef25efa614714669244dd7fc4f198a1d\",\"content_sha256\":\"e55d590b365e0ebb31e6801f925aa033cd3c3bd7329ecc34974ef108806acafe\",\"file_bytes\":1648,\"body_bytes\":607},{\"atom_id\":\"let-only-the-owner-write-the-slot\",\"file_sha256\":\"92250771464f93f359a510999300396fb8a658fb18ba99662c39f25c88c36368\",\"content_sha256\":\"11f961a0bab7302302c65fc14aaeb1e501b66b5a2c3a8af6ebd171ebda2173a6\",\"file_bytes\":1236,\"body_bytes\":181}]"
carrier_sha256: cbcc54bb2fa752cc569a167045cdd9088299a70f9dca9110f8938e39c2be6c42
carrier_bytes: 12964
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-blocker-cannot-be-accepted -->
---
instruction_id: a-blocker-cannot-be-accepted
title: A blocker cannot be accepted
summary: An open conflict that blocks is never closed by accepting the work anyway; the loop offers only the manual route.
capability_tags:
  - review-code
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The loop ends with an open conflict that blocks.
conditions_does_not_apply_when: Only ordinary findings remain open.
artifact_contract_output_type: blocker-escalation
artifact_contract_required_data:
  - the open conflict
  - the route that was offered
artifact_contract_verified_by: the acceptance route was not offered while a blocking conflict was open
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A blocker cannot be accepted
An open plan-revision conflict is a blocker — this loop's whole purpose is to surface it rather than let a success banner paper over it
so escalation cannot end in the same silent acceptance
Only "Manual review" is available:
<!-- vpmodule:atom:end a-blocker-cannot-be-accepted -->
<!-- vpmodule:atom:begin a-loop-that-does-not-change-the-input-cannot-converge -->
---
instruction_id: a-loop-that-does-not-change-the-input-cannot-converge
title: A loop that does not change the input cannot converge
summary: "Re-running the same step against the same unresolved conflict burns a cycle; the conflict has to be resolved by adopting an alternative, overriding the constraint or amending it."
capability_tags:
  - coordinate-program
pattern_tags:
  - verification-before-completion
  - stop-on-conflict
conditions_applies_when: A loop repeats a step that previously failed to resolve an open item.
conditions_does_not_apply_when: The step itself changed since the last attempt.
artifact_contract_output_type: loop-progress-decision
artifact_contract_required_data:
  - the open item
  - the change that was made to it
  - the decision to continue or to stop
artifact_contract_verified_by: "the open item was resolved or the loop stopped, and no cycle was repeated against an unchanged item"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A loop that does not change the input cannot converge
the replan must resolve it by adopting one of its recorded alternatives, overriding the named constraint, or amending the constraint — and mark the entry resolved.

Re-running the planner against an unchanged conflict cannot resolve it and only burns a cycle.
<!-- vpmodule:atom:end a-loop-that-does-not-change-the-input-cannot-converge -->
<!-- vpmodule:atom:begin corroborate-a-single-reviewer-finding-by-its-claim-type -->
---
instruction_id: corroborate-a-single-reviewer-finding-by-its-claim-type
title: Corroborate a single-reviewer finding by its claim type
summary: "A finding raised by one reviewer counts only when its kind earns it: a claim about what exists has to be confirmed, a judgement about design does not."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: One reviewer raised a serious finding and the loop counts it.
conditions_does_not_apply_when: "Two or more reviewers raised it, or the finding is not serious."
artifact_contract_output_type: corroboration-gate
artifact_contract_required_data:
  - the kind of the claim
  - what corroborated it
  - the finding when it did not count
artifact_contract_verified_by: "a single-reviewer finding counted only on the corroboration its kind requires, and one that did not count was still listed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Corroborate a single-reviewer finding by its claim type
Classify each newly raised finding by what the claim ASSERTS, not by whether it happens to contain a file:line citation:
asserts that a named symbol, file, path, flag, commit, or ID exists, is absent, or says something specific
asserts a design or correctness property
A serious finding raised by 2+ reviewers is corroborated and always counts.
counts only if the source-grounding pass independently confirms it against real project source
counts UNLESS that reviewer's own section OPENS with an evidence-quality discount marker blockquote
FAIL OPEN: if EVERY reviewer that ran this cycle carries a discount marker, this gate does not apply at all — count as if it were absent.
A gate must never manufacture convergence out of a cycle in which nothing was verified.
<!-- vpmodule:atom:end corroborate-a-single-reviewer-finding-by-its-claim-type -->
<!-- vpmodule:atom:begin derive-the-reviewer-selection-from-the-roster -->
---
instruction_id: derive-the-reviewer-selection-from-the-roster
title: Derive the reviewer selection from the roster
summary: The reviewer lineup is taken from the declared roster and the configured default; it is never hand-listed in the run.
capability_tags:
  - review-code
pattern_tags:
  - project-conventions-first
conditions_applies_when: The run has to choose which reviewers take part.
conditions_does_not_apply_when: The lineup was given explicitly on the command line.
artifact_contract_output_type: reviewer-selection
artifact_contract_required_data:
  - the roster the selection came from
  - the resolved lineup
artifact_contract_verified_by: the selection came from the declared roster and the configured default was not overridden
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Derive the reviewer selection from the roster
DERIVED from the declared lane roster
never hand-listed.
invocation respects the configured reviewer lineup
<!-- vpmodule:atom:end derive-the-reviewer-selection-from-the-roster -->
<!-- vpmodule:atom:begin fail-closed-on-an-unreadable-gate -->
---
instruction_id: fail-closed-on-an-unreadable-gate
title: Fail closed on an unreadable gate
summary: "A gate whose record cannot be read blocks the run: \"I cannot tell\" is never read as \"nothing is wrong\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A gate has to be evaluated and its record cannot be read.
conditions_does_not_apply_when: The record was read and the gate evaluated.
artifact_contract_output_type: gate-read-failure
artifact_contract_required_data:
  - the record that could not be read
  - the block that was raised
artifact_contract_verified_by: the run stopped instead of declaring the gate satisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fail closed on an unreadable gate
A missing file is not an empty result.
is "I cannot tell", never "no conflicts".
Refusing to declare convergence on an unverifiable gate.
<!-- vpmodule:atom:end fail-closed-on-an-unreadable-gate -->
<!-- vpmodule:atom:begin flag-only-contradictions-not-restatements -->
---
instruction_id: flag-only-contradictions-not-restatements
title: "Flag only contradictions, not restatements"
summary: Two artifacts that say the same thing differently are not drift; only a contradiction between them is.
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two planning artifacts state the same kind of fact.
conditions_does_not_apply_when: Only one artifact holds the fact.
artifact_contract_output_type: cross-artifact-drift
artifact_contract_required_data:
  - the two locations
  - the contradiction
  - the authority that decides
artifact_contract_verified_by: only a contradiction was flagged and every restatement was left alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Flag only contradictions, not restatements
Two passages that merely read alike, or that restate one fact at different levels of detail, are NOT drift.
Only a contradiction is.
single-source is the target state, not a finding
that axis is skipped and the skip is recorded in the same "Verification coverage" block
A clean pass must never mean "nothing was compared."
Completeness is terminal: when exactly one side says the phase is complete, the verdict is drifted and never lag, however few steps apart the two words look.
<!-- vpmodule:atom:end flag-only-contradictions-not-restatements -->
<!-- vpmodule:atom:begin ground-every-cited-symbol-in-the-source -->
---
instruction_id: ground-every-cited-symbol-in-the-source
title: Ground every cited symbol in the source
summary: "Every symbol the work cites is resolved against the source, and the symbols that could not be checked are listed."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A plan cites symbols that have to be checked.
conditions_does_not_apply_when: Nothing is cited.
artifact_contract_output_type: symbol-grounding
artifact_contract_required_data:
  - the cited symbols
  - the verdict for each
  - the symbols that could not be checked
artifact_contract_verified_by: every cited symbol carries a verdict and the unchecked ones are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ground every cited symbol in the source
List every referenced symbol by kind, quoting the plan line for each (coverage must be auditable)
Resolve each remaining symbol using the effective authority adapter
Never treat UNCHECKABLE as verified or missing.
listing every UNCHECKABLE/skipped symbol and why — a clean review must never silently mean "nothing was checked."
stops the review cycle immediately; do not proceed until the plan author resolves the missing symbol.
plan proceeds only if the author confirms the symbol is genuinely new or dynamically resolved, and that acknowledgement is recorded.
<!-- vpmodule:atom:end ground-every-cited-symbol-in-the-source -->
<!-- vpmodule:atom:begin let-only-the-owner-write-the-slot -->
---
instruction_id: let-only-the-owner-write-the-slot
title: Let only the owner write the slot
summary: A block that carries the state of a gate is written by its owner alone; every other agent reads it and leaves it byte for byte.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Another agent can write the artifact that holds a gate block.
conditions_does_not_apply_when: You are the owner of the block.
artifact_contract_output_type: owned-slot
artifact_contract_required_data:
  - the owner of the block
  - the block as it was read
artifact_contract_verified_by: the block was read unchanged and only its owner wrote into it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let only the owner write the slot
Appending, editing, reordering or deleting a line there forges the state of a blocking gate.
Readers read.
Only the owner writes into the block.
<!-- vpmodule:atom:end let-only-the-owner-write-the-slot -->