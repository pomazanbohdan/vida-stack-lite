---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-code-review-md-6efaabf0-c01"
title: "gsd-core: gsd-core/workflows/code-review.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/code-review.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/code-review.md\"}"
atom_ids:
  - cross-check-two-scopes-and-add-what-one-missed
  - derive-the-scope-from-one-resolver
  - do-not-write-a-partial-artifact-when-the-delegated-step-fails
  - keep-the-guard-and-the-step-it-protects-in-one-decision
  - let-the-worker-write-the-artifact-but-not-the-commit
  - name-the-dropped-items-not-only-the-count
  - tell-nothing-changed-from-nothing-found
  - validate-the-user-input-before-the-capability-gate
atom_count: 8
atoms: "[{\"atom_id\":\"cross-check-two-scopes-and-add-what-one-missed\",\"file_sha256\":\"ac16d4e344b60946acb6174c3e3bcb7186cdfc9bfe99d65736c623956f59f972\",\"content_sha256\":\"71a2fb77a733dd3426be6c1650ea32c8a90f491f90851b28aa6fc901ee0364fe\",\"file_bytes\":1364,\"body_bytes\":254},{\"atom_id\":\"derive-the-scope-from-one-resolver\",\"file_sha256\":\"3249ce5ca77184564e3d68d148aa08aa46bebc685f9b13e6787daeb4bf7717f6\",\"content_sha256\":\"f8e0c42156eaa2c6a3116b874a0c730b9ef2df0a6ab55af098a9426db5ecf0d4\",\"file_bytes\":1397,\"body_bytes\":259},{\"atom_id\":\"do-not-write-a-partial-artifact-when-the-delegated-step-fails\",\"file_sha256\":\"17b6162195c713e2388de6954caf6f7f6a07532ab96e0e255d7403c37a35c7e3\",\"content_sha256\":\"1a45fa6d1ae09675df4c109a8540b69c8ccec82ec45758b4f1e04b9e3d72a1f1\",\"file_bytes\":1310,\"body_bytes\":187},{\"atom_id\":\"keep-the-guard-and-the-step-it-protects-in-one-decision\",\"file_sha256\":\"f9fbf04b344c91c0d32da453698006b44908ebf2ff19ba18ee94eede4054b4da\",\"content_sha256\":\"2a2f4d560d8da42fffb30dbc9a3fb1167f50791a1c50a5d78cfad4797a26c5fe\",\"file_bytes\":1620,\"body_bytes\":465},{\"atom_id\":\"let-the-worker-write-the-artifact-but-not-the-commit\",\"file_sha256\":\"f24a8a77d8be5bee1afd48aac872a1885a6d2413b62fb833849530566331ece3\",\"content_sha256\":\"ac3f1644e33c9b1d8fc2c4e74df7273918979582f056358a08b8648aee5939ec\",\"file_bytes\":1240,\"body_bytes\":148},{\"atom_id\":\"name-the-dropped-items-not-only-the-count\",\"file_sha256\":\"befc5891e19d24dfe48b19c1bce88829aff02d5419ea0d5e4556a6b57bb9b960\",\"content_sha256\":\"f950bef03355750f994929ca72ee4ef715d2f6a69f8c9b2374f6cf1379b0004b\",\"file_bytes\":1159,\"body_bytes\":177},{\"atom_id\":\"tell-nothing-changed-from-nothing-found\",\"file_sha256\":\"b5e64cac6f842f013498c41f467a158518c1122bc78a7820fd73484a75e158f0\",\"content_sha256\":\"46a6c0091312c8e40704928820685807f781ec80ec9b7f78425a9ffaf62a636c\",\"file_bytes\":1227,\"body_bytes\":164},{\"atom_id\":\"validate-the-user-input-before-the-capability-gate\",\"file_sha256\":\"a73b5adc8f052aabad9b2be0327adf5e2b0def8195a0ab532c8fddb555a532b2\",\"content_sha256\":\"23526b738d3c45b8edceb9b380bb193f437adab6c01df4ccc9edb794b05ff8b7\",\"file_bytes\":1354,\"body_bytes\":192}]"
carrier_sha256: 88cc18a62e2503ee129747a2b58b90f490f81ac4328c30bd808a8ec6411b826e
carrier_bytes: 11890
revision: 1
status: active
---
<!-- vpmodule:atom:begin cross-check-two-scopes-and-add-what-one-missed -->
---
instruction_id: cross-check-two-scopes-and-add-what-one-missed
title: Cross-check two scopes and add what one missed
summary: "Two independent scopes are compared, and whatever one of them did not surface is warned about and added, so a partial result cannot mask the rest of the work."
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: Two scopes describe the same work and one of them may be partial.
conditions_does_not_apply_when: Only one scope exists.
artifact_contract_output_type: scope-cross-check
artifact_contract_required_data:
  - the two scopes
  - the files the first scope missed
  - the files added
artifact_contract_verified_by: no file in the second scope is missing from the first after the cross-check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Cross-check two scopes and add what one missed
Cross-check the SUMMARY scope against it and warn about (then add) any in-scope files the SUMMARY extractor did not surface - so a partial SUMMARY result can no longer silently mask the rest of the phase.
<!-- vpmodule:atom:end cross-check-two-scopes-and-add-what-one-missed -->
<!-- vpmodule:atom:begin derive-the-scope-from-one-resolver -->
---
instruction_id: derive-the-scope-from-one-resolver
title: Derive the scope from one resolver
summary: "One resolver owns the scope; a later step never derives a range of its own, and a scope that could not be read is reported as unresolvable instead of as an empty scope."
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The set of files in scope is computed and later steps consume it.
conditions_does_not_apply_when: The scope is given directly.
artifact_contract_output_type: scope-resolution
artifact_contract_required_data:
  - the resolver that owns the scope
  - the scope it returned
  - "what it dropped, by name"
artifact_contract_verified_by: no second derivation of the range exists and an unreadable scope is not reported as empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Derive the scope from one resolver
This step derives no commit range of its own.
An unreadable phase or repository is `unresolvable`, never an empty scope that reports success.
The resolver also reports, by name rather than by count, what the union dropped
<!-- vpmodule:atom:end derive-the-scope-from-one-resolver -->
<!-- vpmodule:atom:begin do-not-write-a-partial-artifact-when-the-delegated-step-fails -->
---
instruction_id: do-not-write-a-partial-artifact-when-the-delegated-step-fails
title: Do not write a partial artifact when the delegated step fails
summary: "When the delegated step fails, no partial and no empty report is written and the commit step is not reached; the failure is reported instead."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A delegated step that should produce a report failed.
conditions_does_not_apply_when: The delegated step returned a usable report.
artifact_contract_output_type: delegation-failure-record
artifact_contract_required_data:
  - the failure
  - the absence of a report
artifact_contract_verified_by: no partial or empty report exists and the commit step was not reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not write a partial artifact when the delegated step fails
If the Agent() call fails (agent error, timeout, or exception):
Do NOT create a partial or empty REVIEW.md. Exit workflow.
<!-- vpmodule:atom:end do-not-write-a-partial-artifact-when-the-delegated-step-fails -->
<!-- vpmodule:atom:begin keep-the-guard-and-the-step-it-protects-in-one-decision -->
---
instruction_id: keep-the-guard-and-the-step-it-protects-in-one-decision
title: Keep the guard and the step it protects in one decision
summary: "The check that protects a step and the step it protects form one decision: a failure of the check stops the run before the protected value is produced, and it is never treated as a default."
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A check guards the value that a later step consumes.
conditions_does_not_apply_when: The value is produced without a check.
artifact_contract_output_type: guard-decision
artifact_contract_required_data:
  - the check
  - the value it protects
  - the failure branch
artifact_contract_verified_by: a failed check stops the run before the protected value is produced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the guard and the step it protects in one decision
The guard and the extraction it protects must run as one shell control-flow decision - a prose sentence between two fenced blocks is not a guard, since fenced blocks do not share shell state.
Anything other than the literal string `true` (including an empty `DEPTH_OK`, which is what a crashed or missing resolver produces) is treated as failure, and the failure branch exits before any extraction can run:
<!-- vpmodule:atom:end keep-the-guard-and-the-step-it-protects-in-one-decision -->
<!-- vpmodule:atom:begin let-the-worker-write-the-artifact-but-not-the-commit -->
---
instruction_id: let-the-worker-write-the-artifact-but-not-the-commit
title: Let the worker write the artifact but not the commit
summary: "The delegated worker writes the findings into the report file and leaves the commit to the orchestrator, so there is one writer of the history."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker is delegated the job of producing a report.
conditions_does_not_apply_when: The worker is only asked to answer.
artifact_contract_output_type: delegation-contract
artifact_contract_required_data:
  - what the worker writes
  - what the orchestrator commits
artifact_contract_verified_by: the worker wrote the report and the orchestrator made the commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Let the worker write the artifact but not the commit
Write findings to the report path.
Do NOT commit the output - the orchestrator handles that.
<!-- vpmodule:atom:end let-the-worker-write-the-artifact-but-not-the-commit -->
<!-- vpmodule:atom:begin name-the-dropped-items-not-only-the-count -->
---
instruction_id: name-the-dropped-items-not-only-the-count
title: "Name the dropped items, not only the count"
summary: "Every item removed from a scope is named, because a count hides whether the dropped item held the whole deliverable."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: Items are removed from a scope or a list.
conditions_does_not_apply_when: Nothing is removed.
artifact_contract_output_type: dropped-item-list
artifact_contract_required_data:
  - each dropped item by name
  - the count
artifact_contract_verified_by: "every dropped item is named, not only counted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the dropped items, not only the count
Remove paths that don't exist on disk, and name each one
A count hides whether the dropped file held the phase's entire deliverable
<!-- vpmodule:atom:end name-the-dropped-items-not-only-the-count -->
<!-- vpmodule:atom:begin tell-nothing-changed-from-nothing-found -->
---
instruction_id: tell-nothing-changed-from-nothing-found
title: Tell nothing changed from nothing found
summary: "An empty file list means there is nothing new to re-review, not that the work has no standing findings; the two are reported differently."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: The computed scope of a review is empty.
conditions_does_not_apply_when: The scope contains at least one file.
artifact_contract_output_type: empty-scope-report
artifact_contract_required_data:
  - the empty scope
  - what the empty scope means
artifact_contract_verified_by: "the report says there is nothing new to review, not that there are no findings"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell nothing changed from nothing found
Means nothing new to re-review - NOT a phase with no standing findings.
No source files changed in phase
Skipping review.
<!-- vpmodule:atom:end tell-nothing-changed-from-nothing-found -->
<!-- vpmodule:atom:begin validate-the-user-input-before-the-capability-gate -->
---
instruction_id: validate-the-user-input-before-the-capability-gate
title: Validate the user input before the capability gate
summary: "The input the user gave is checked before the configuration gate is consulted, so a wrong input is reported as a wrong input and never as a disabled capability."
capability_tags:
  - clarify-requirements
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A command can be refused because a capability is switched off and the user input may also be wrong.
conditions_does_not_apply_when: The user input is already known to be valid.
artifact_contract_output_type: input-validation-order
artifact_contract_required_data:
  - the validation result
  - the gate consulted afterwards
artifact_contract_verified_by: the user error was reported before the gate was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Validate the user input before the capability gate
This runs BEFORE config gate check so user errors are surfaced immediately regardless of config state.
Only skip when explicitly disabled.
<!-- vpmodule:atom:end validate-the-user-input-before-the-capability-gate -->