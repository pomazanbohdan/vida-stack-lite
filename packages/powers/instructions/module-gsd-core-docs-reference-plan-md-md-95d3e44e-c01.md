---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-reference-plan-md-md-95d3e44e-c01"
title: "gsd-core: docs/reference/plan-md.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/reference/plan-md.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/reference/plan-md.md\"}"
atom_ids:
  - express-the-acceptance-criteria-as-greppable-conditions
  - make-the-action-concrete-with-identifiers-and-paths
  - mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete
  - write-the-verify-command-so-it-can-distinguish-pass-from-fail
atom_count: 4
atoms: "[{\"atom_id\":\"express-the-acceptance-criteria-as-greppable-conditions\",\"file_sha256\":\"233123653d9f0fb479fd615eaa0e1f4b488f68eefb4447932c5d40b1fac8f512\",\"content_sha256\":\"5bdafb11468f2c4a8d76d21c382d438d2bae43ad83e6c7e3e6c31f340ee41ef1\",\"file_bytes\":1351,\"body_bytes\":216},{\"atom_id\":\"make-the-action-concrete-with-identifiers-and-paths\",\"file_sha256\":\"0e49bce2ef22a91c27b92ef379a7e91f499f7b39255d59e21546b4ba2be4c750\",\"content_sha256\":\"65f7af2ddf224dac2afe7859442803aca4a1b2a3bf7518fc340ddf29b2622c64\",\"file_bytes\":1448,\"body_bytes\":280},{\"atom_id\":\"mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete\",\"file_sha256\":\"386949951325a54154d540744fb730206a797007fb8c7df8e326e289f3049cad\",\"content_sha256\":\"732020c7be1da5c446f8accfe09b97d3656dfcb1a5979e9f538ff3be484a6ce0\",\"file_bytes\":1565,\"body_bytes\":335},{\"atom_id\":\"write-the-verify-command-so-it-can-distinguish-pass-from-fail\",\"file_sha256\":\"31a145bc9c6997caf12df78b76a70c4160704fcd2c629b012f98a1e30be3741c\",\"content_sha256\":\"490ae53f9a6d32d8fe53321640d74a9173df3ae0cb433cfb0781a3ade78edd94\",\"file_bytes\":1282,\"body_bytes\":190}]"
carrier_sha256: d98e75589bed2ca658a597194ae473e372a98606e05170e804b8355c661be302
carrier_bytes: 6345
revision: 1
status: active
---
<!-- vpmodule:atom:begin express-the-acceptance-criteria-as-greppable-conditions -->
---
instruction_id: express-the-acceptance-criteria-as-greppable-conditions
title: Express the acceptance criteria as greppable conditions
summary: An acceptance criterion is written as a condition that a command or a search can check; subjective wording is not a criterion.
capability_tags:
  - write-tests-first
pattern_tags:
  - testable-criteria
conditions_applies_when: The acceptance criteria of a task are being written.
conditions_does_not_apply_when: The criterion can only be judged by a person looking at the result.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the conditions that are written
  - the way each one is checked
  - the subjective wording that is refused
artifact_contract_verified_by: every criterion is checkable by a command or a search
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Express the acceptance criteria as greppable conditions
- Verifiable conditions: grep-verifiable strings, command exit codes, observable behaviours. No subjective language ("looks correct", "properly configured").
<!-- vpmodule:atom:end express-the-acceptance-criteria-as-greppable-conditions -->
<!-- vpmodule:atom:begin make-the-action-concrete-with-identifiers-and-paths -->
---
instruction_id: make-the-action-concrete-with-identifiers-and-paths
title: Make the action concrete with identifiers and paths
summary: "The action of a task names the exact identifiers, file paths, signatures and values it touches, and never says to align one thing with another without stating the target state."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The action of a task is being written.
conditions_does_not_apply_when: The action is a research question that is not yet decided.
artifact_contract_output_type: task-action
artifact_contract_required_data:
  - the identifiers the action names
  - the target state it specifies
  - what it does not contain
artifact_contract_verified_by: "the action names exact identifiers, paths and values and states the target"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make the action concrete with identifiers and paths
- Concrete instructions with exact identifiers, file paths, function signatures, and expected values. Never says "align X with Y" without specifying the target state. Never contains fenced code blocks or full implementations.
<!-- vpmodule:atom:end make-the-action-concrete-with-identifiers-and-paths -->
<!-- vpmodule:atom:begin mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete -->
---
instruction_id: mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete
title: Mark a superseded plan so it does not hold the phase below complete
summary: "A unit of work that was reassigned or dropped is marked, so it leaves both the numerator and the denominator of the phase's completion count instead of holding the phase below done forever."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A unit of work will never be executed because its work moved elsewhere.
conditions_does_not_apply_when: The unit of work is going to be executed.
artifact_contract_output_type: superseded-marker
artifact_contract_required_data:
  - the plan that is superseded
  - the counts it leaves
  - "what happens to the phase's completion"
artifact_contract_verified_by: the superseded plan left the completion counts and the phase reads complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark a superseded plan so it does not hold the phase below complete
- Add `status: superseded` to that plan's frontmatter to exclude it from **both** the plan count (denominator) and the summary count (numerator):
- A phase with 13 plans, two of them `superseded`, then reads `11/11 → complete` — no fabricated summary required.
<!-- vpmodule:atom:end mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete -->
<!-- vpmodule:atom:begin write-the-verify-command-so-it-can-distinguish-pass-from-fail -->
---
instruction_id: write-the-verify-command-so-it-can-distinguish-pass-from-fail
title: Write the verify command so it can distinguish pass from fail
summary: The command that proves a task succeeded can fail; a check that always succeeds is not a check.
capability_tags:
  - write-tests-first
pattern_tags:
  - testable-criteria
conditions_applies_when: A task carries the command that proves it succeeded.
conditions_does_not_apply_when: The command is only there to be read by a person.
artifact_contract_output_type: verify-command
artifact_contract_required_data:
  - the command that runs
  - how pass and fail are told apart
  - what a command that always succeeds would be
artifact_contract_verified_by: the verify command distinguishes pass from fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write the verify command so it can distinguish pass from fail
- A runnable command or check that proves the task succeeded. Must distinguish pass from fail — `echo "done"` is not valid.
<!-- vpmodule:atom:end write-the-verify-command-so-it-can-distinguish-pass-from-fail -->