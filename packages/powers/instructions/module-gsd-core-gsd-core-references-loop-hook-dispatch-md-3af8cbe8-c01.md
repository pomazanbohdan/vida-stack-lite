---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-loop-hook-dispatch-md-3af8cbe8-c01"
title: "gsd-core: gsd-core/references/loop-hook-dispatch.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:gsd-core/references/loop-hook-dispatch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/loop-hook-dispatch.md\"}"
atom_ids:
  - dispatch-every-hook-shape-not-one-hardcoded-shape
  - implement-the-dispatch-contract-for-every-entry-kind
  - keep-a-step-advisory-and-a-gate-blocking
  - treat-a-check-that-could-not-look-as-no-verdict
  - treat-an-unreadable-evidence-as-a-failure-not-a-verdict
  - validate-a-manifest-command-in-context-before-you-run-it
  - validate-a-manifest-value-in-context-before-any-shell-use
atom_count: 7
atoms: "[{\"atom_id\":\"dispatch-every-hook-shape-not-one-hardcoded-shape\",\"file_sha256\":\"9434c54f655fd01d1112df1eeca3e1a403b2a5f8b84c5fa995604c5f04910d11\",\"content_sha256\":\"11a15f1faec8339c8ffeea8b158a24267fcaba2c75f032d6f87d065274a41235\",\"file_bytes\":1335,\"body_bytes\":190},{\"atom_id\":\"implement-the-dispatch-contract-for-every-entry-kind\",\"file_sha256\":\"3a020803b89f70b91991c12116f5c61b2de3b6ad052e35b1a853cade765f8427\",\"content_sha256\":\"7c1a3bff378a8b39d4fd0b29a0b2b8b1aa174f8d8f0d1d1264029fee0ed93e58\",\"file_bytes\":1989,\"body_bytes\":726},{\"atom_id\":\"keep-a-step-advisory-and-a-gate-blocking\",\"file_sha256\":\"ec02ee5b54c2640af4f6cc59158d5279b2f0010706aa3f2b656caaf8a671b13e\",\"content_sha256\":\"50d1dfb15e3905a6071b781c36b0df1adf4d2b700d0830708146b4a1f1385fd8\",\"file_bytes\":1535,\"body_bytes\":479},{\"atom_id\":\"treat-a-check-that-could-not-look-as-no-verdict\",\"file_sha256\":\"5d0112a2e5e6f9093de325c5d9354b756a703ebae824206ec222b6ccca6211ed\",\"content_sha256\":\"0ceb07dce0a65fff02df8c25374db340ac4e25ae5e14a1da62f69c141ad314aa\",\"file_bytes\":1717,\"body_bytes\":423},{\"atom_id\":\"treat-an-unreadable-evidence-as-a-failure-not-a-verdict\",\"file_sha256\":\"2d1640d0c833f943a18523c24d8999ff38a219ab06bf41af37e590126540b7d4\",\"content_sha256\":\"908903f1360fccaaa0e75b17b1f95d3a3eb1ec767c94d9a9d6df67ab99ee4852\",\"file_bytes\":1921,\"body_bytes\":644},{\"atom_id\":\"validate-a-manifest-command-in-context-before-you-run-it\",\"file_sha256\":\"3c786886d058ca5044a54a70a7aa38d099dbcfbe86fbd12173a21418e7e78a5d\",\"content_sha256\":\"160669347ed4d14a42ba61fc78806a6ff0c3ab5231de2b79f4d335ba9b0f64e0\",\"file_bytes\":1869,\"body_bytes\":673},{\"atom_id\":\"validate-a-manifest-value-in-context-before-any-shell-use\",\"file_sha256\":\"c19e2c22425b7da58912cecdcb277aa906454e1c3e15f48509011e045898c727\",\"content_sha256\":\"2ec3ddfff1df4812438dcbc44035b7f0dba241e138120c62dca57a65a9fa3601\",\"file_bytes\":2558,\"body_bytes\":1252}]"
carrier_sha256: b4059fb0de599e68bf8be41797ee706bae4487b7dafa889eb2ff938e5bb5dc4b
carrier_bytes: 14041
revision: 1
status: active
---
<!-- vpmodule:atom:begin dispatch-every-hook-shape-not-one-hardcoded-shape -->
---
instruction_id: dispatch-every-hook-shape-not-one-hardcoded-shape
title: "Dispatch every hook shape, not one hardcoded shape"
summary: A dispatcher that hand-rolls a single entry shape silently drops every other shape registered at that point.
capability_tags:
  - execute-plan
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: A point in a workflow dispatches the entries registered for it.
conditions_does_not_apply_when: The point has exactly one registered shape and no others can appear.
artifact_contract_output_type: dispatch-coverage
artifact_contract_required_data:
  - the registered entry shapes
  - the shape that was dispatched
  - the shapes that were skipped
artifact_contract_verified_by: "every registered shape was dispatched, not only the hardcoded one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Dispatch every hook shape, not one hardcoded shape
A point whose workflow hand-rolls one `kind` does not implement this contract
Dispatches every active `step` entry, not one shape of one
<!-- vpmodule:atom:end dispatch-every-hook-shape-not-one-hardcoded-shape -->
<!-- vpmodule:atom:begin implement-the-dispatch-contract-for-every-entry-kind -->
---
instruction_id: implement-the-dispatch-contract-for-every-entry-kind
title: Implement the dispatch contract for every entry kind
summary: "A dispatch implementation handles every entry the contract defines, not the one shape it happened to see; an empty list is skipped silently and an advisory entry never blocks."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A workflow consumes the registered extensions of an extension point.
conditions_does_not_apply_when: The point is evaluated once per task by its own dedicated mechanism.
artifact_contract_output_type: dispatch-implementation
artifact_contract_required_data:
  - the entry kinds the contract defines
  - the kinds the implementation dispatches
  - the behaviour for an empty list
artifact_contract_verified_by: every defined entry kind is dispatched and an empty list is skipped without output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Implement the dispatch contract for every entry kind
A point whose workflow hand-rolls one `kind` does not implement this contract. Several host workflows historically matched a single hook
so any other step registered there was declared and silently never run. When a workflow defers to this file, it dispatches **every** active `step` entry, not one shape of one.
A `step` is **advisory by construction**: it never blocks or redirects the host workflow - that is what a `gate` is for. Each dispatch is best-effort; on error record a warning and continue, honoring `onError`.
If `activeHooks` is absent, null, or an empty array, skip silently and continue to the next step in the workflow. No output to the user is needed.
<!-- vpmodule:atom:end implement-the-dispatch-contract-for-every-entry-kind -->
<!-- vpmodule:atom:begin keep-a-step-advisory-and-a-gate-blocking -->
---
instruction_id: keep-a-step-advisory-and-a-gate-blocking
title: Keep a step advisory and a gate blocking
summary: "A step never blocks or redirects the workflow; only a gate blocks, and a failing step records a warning and continues."
capability_tags:
  - execute-plan
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A dispatched step or a gate is about to run.
conditions_does_not_apply_when: The workflow itself defines the step as blocking.
artifact_contract_output_type: blocking-policy
artifact_contract_required_data:
  - the entry kind
  - the blocking flag
  - the action taken on the outcome
artifact_contract_verified_by: a step never stopped the workflow and a blocking gate did
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a step advisory and a gate blocking
A `step` is advisory by construction: it never blocks or redirects the host workflow — that is what a `gate` is for. Each dispatch is best-effort; on error record a warning and continue, honoring `onError`
`blocking: true` → if the check returns `block: true`, surface `check.message` to the user and stop the current step. Do not continue
`blocking: false` → advisory only; surface the message but continue regardless of outcome
<!-- vpmodule:atom:end keep-a-step-advisory-and-a-gate-blocking -->
<!-- vpmodule:atom:begin treat-a-check-that-could-not-look-as-no-verdict -->
---
instruction_id: treat-a-check-that-could-not-look-as-no-verdict
title: Treat a check that could not look as no verdict
summary: "A check that could not read its evidence has produced no verdict; it is routed by the error policy, not read as a result."
capability_tags:
  - verify-work-results
  - degrade-gracefully-under-failure
pattern_tags:
  - evidence-analysis
conditions_applies_when: A check exits with an error instead of returning a verdict.
conditions_does_not_apply_when: "The check returned a verdict, including a blocking one."
artifact_contract_output_type: error-routing
artifact_contract_required_data:
  - the error
  - the error policy that applies
  - the disposition
artifact_contract_verified_by: no verdict is read out of the failed check and the policy decides what happens
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verify-command-path-resolvability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a check that could not look as no verdict
Honor `onError` if the check itself errors: `skip` means treat as non-blocking and continue; `halt` means surface the error and stop
That JSON is not a verdict — do not act on its `block`; route it by `onError` as a step-1 command failure
A non-empty `readError` means the probe could not look. Report that as a WARNING in its own words; it is not a clean bill of health
<!-- vpmodule:atom:end treat-a-check-that-could-not-look-as-no-verdict -->
<!-- vpmodule:atom:begin treat-an-unreadable-evidence-as-a-failure-not-a-verdict -->
---
instruction_id: treat-an-unreadable-evidence-as-a-failure-not-a-verdict
title: "Treat an unreadable evidence as a failure, not a verdict"
summary: "A check that could not read its evidence prints a JSON error payload, not a verdict; the block field of that payload is never acted on, and the failure is routed by the error policy."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check exits non-zero because it could not read the evidence it was asked to judge.
conditions_does_not_apply_when: "The check delivered a verdict, blocking or not."
artifact_contract_output_type: unreadable-evidence-report
artifact_contract_required_data:
  - what could not be read
  - the error policy that was applied
  - the route the failure took
artifact_contract_verified_by: the block field of the error payload was not acted on and the failure was routed as a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat an unreadable evidence as a failure, not a verdict
That JSON is not a verdict - do not act on its `block`; route it by `onError` as a step-1 command failure. Exit `0` always means a delivered verdict, a blocking one included (`block: true`): a gate verb never exits non-zero to say "blocked".
A gate verb exits
when it **could not look** at its evidence, still printing the gate's usual JSON (its own fields name what could not be read, such as `status: "unresolvable"`, `readError`, or `unreadable`).
Honor `onError` if the check itself errors: `skip` means treat as non-blocking and continue; `halt` means surface the error and stop.
<!-- vpmodule:atom:end treat-an-unreadable-evidence-as-a-failure-not-a-verdict -->
<!-- vpmodule:atom:begin validate-a-manifest-command-in-context-before-you-run-it -->
---
instruction_id: validate-a-manifest-command-in-context-before-you-run-it
title: Validate a manifest command in context before you run it
summary: "A command string taken from a manifest is checked against the allowed pattern in context, never by pasting it into a shell to be tested there."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A command or predicate value comes from a manifest that may be third-party.
conditions_does_not_apply_when: The value was written by you and is already known.
artifact_contract_output_type: validated-invocation
artifact_contract_required_data:
  - the value that was checked
  - the pattern it was checked against
  - the disposition when it failed
artifact_contract_verified_by: the value was checked in context and a value that failed was not run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate a manifest command in context before you run it
Validate it IN-CONTEXT first, before any shell use. It comes from a capability manifest, which may be third-party
Never by pasting it into a shell command to be tested there, because a value carrying a quote, `;`, a ` ` `, `$(`, or a newline would terminate the assignment and run as its own statement before any shell-side check could execute
A value that fails is a malformed manifest: record a warning, route it per the gate's `onError`, and do not run it
Pass `check.predicate` as a single argv element for the same reason — never re-quote it into a shell string, where an apostrophe would close the literal
<!-- vpmodule:atom:end validate-a-manifest-command-in-context-before-you-run-it -->
<!-- vpmodule:atom:begin validate-a-manifest-value-in-context-before-any-shell-use -->
---
instruction_id: validate-a-manifest-value-in-context-before-any-shell-use
title: Validate a manifest value in context before any shell use
summary: "A value that came from a manifest is checked in the context, never by pasting it into a shell command to be tested there; a value that fails the check is a malformed manifest and is skipped with a warning."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A value read from a manifest is about to reach a shell or an invocation.
conditions_does_not_apply_when: The value was written by you in this session and is trusted.
artifact_contract_output_type: validated-invocation
artifact_contract_required_data:
  - the pattern the value was checked against
  - the warning recorded for a value that failed
  - the way the value was passed on
artifact_contract_verified_by: the value was checked before any shell use and a value that failed was never run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate a manifest value in context before any shell use
Normalize the query value you read from `activeHooks` first: replace every `.` with `-`. Then check the normalized value against `^[a-z][a-z0-9]*(-[a-z0-9]+)*( [a-z][a-z0-9]*(-[a-z0-9]+)*)*$` yourself, IN-CONTEXT - **never** by pasting it into a shell command to be tested there, because a value carrying a quote, `;`, a `` ` ``, `$(`, or a newline would terminate the assignment and run as its own statement before any shell-side check could execute.
The normalized value is the one value you validate and the one value you pass: wherever `${hook.check.query}` appears, write the normalized value. A leading dot, a trailing dot or consecutive dots become a leading, trailing or doubled hyphen, which the pattern rejects.
A value that fails is a malformed manifest: record a warning, skip that hook, continue to the next entry. Only a value that has passed is run, with the phase number appended:
Pass `check.predicate` as a **single argv element** for the same reason - never re-quote it into a shell string, where an apostrophe would close the literal.
**Validate `check` before any shell use.**
`check.query` and `check.predicate` come from a capability manifest, which may be third-party
<!-- vpmodule:atom:end validate-a-manifest-value-in-context-before-any-shell-use -->