---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-state-a-failing-direction-md-1c232825-c01"
title: "gsd-core: docs/how-to/state-a-failing-direction.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/how-to/state-a-failing-direction.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/state-a-failing-direction.md\"}"
atom_ids:
  - migrate-by-hand-to-preserve-the-plan-as-reviewed
  - name-the-signal-that-reveals-a-silent-no-op
  - state-the-failing-direction-of-every-command
atom_count: 3
atoms: "[{\"atom_id\":\"migrate-by-hand-to-preserve-the-plan-as-reviewed\",\"file_sha256\":\"1dc48b8ce6631579e26b24405e97496ecaf1998d861e36a88da71258c1b218e5\",\"content_sha256\":\"ee58d3c70cbded4b6f2881db5673d12bd64553ded172ae0dee3dfb7dea3bbed1\",\"file_bytes\":1426,\"body_bytes\":326},{\"atom_id\":\"name-the-signal-that-reveals-a-silent-no-op\",\"file_sha256\":\"980f2b8edf9de6e0529769a8e010e5f36adc6c12f0480d0fab01d5c0d95d04cd\",\"content_sha256\":\"b846239c510914677fd68e66c25457054616be9ae445c2ed25f3ccf11857e9a0\",\"file_bytes\":1437,\"body_bytes\":398},{\"atom_id\":\"state-the-failing-direction-of-every-command\",\"file_sha256\":\"1f80012bd7e9e5f74901987d58dac8eaa878b1a326d73e24df1989f92e9151d3\",\"content_sha256\":\"abea34ebe82c1113947a36053042ca5b2dfbe469dc2748a2777725d52a27cd0a\",\"file_bytes\":1445,\"body_bytes\":337}]"
carrier_sha256: c16ea8213d44a07f082dae5a5cd15d703c7d333cf649963eaa80017e52362dd7
carrier_bytes: 4751
revision: 1
status: active
---
<!-- vpmodule:atom:begin migrate-by-hand-to-preserve-the-plan-as-reviewed -->
---
instruction_id: migrate-by-hand-to-preserve-the-plan-as-reviewed
title: Migrate by hand to preserve the plan as reviewed
summary: "A plan that predates the rule is migrated by adding the statements by hand, so the reviewed plan stays the reviewed plan."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan written before the rule exists is checked against it.
conditions_does_not_apply_when: The plan is written with the rule in force.
artifact_contract_output_type: plan-migration
artifact_contract_required_data:
  - the plan that was migrated
  - the statements that were added
artifact_contract_verified_by: the plan carries the statements and the rest of the reviewed plan is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Migrate by hand to preserve the plan as reviewed
**Add the statements by hand.** Run the probe with `--raw`, and for each `missing` row open the named `plan` and `task` and add a `<fails_when>` after that command. This preserves the plan as reviewed.
Do this when the plan needs revising anyway; it discards any hand edits.
<!-- vpmodule:atom:end migrate-by-hand-to-preserve-the-plan-as-reviewed -->
<!-- vpmodule:atom:begin name-the-signal-that-reveals-a-silent-no-op -->
---
instruction_id: name-the-signal-that-reveals-a-silent-no-op
title: Name the signal that reveals a silent no-op
summary: "The statement is the answer to one question: what in the output would show that the command was doing nothing."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: The failing direction of a command is written.
conditions_does_not_apply_when: The command was not runnable.
artifact_contract_output_type: failing-direction-statement
artifact_contract_required_data:
  - the observable signal that would reveal a no-op
artifact_contract_verified_by: the statement names an output signal and not a restatement of failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the signal that reveals a silent no-op
Ask one question: **if this command were silently doing nothing, what in its output would tell me?** The answer is the statement.
If there is no answer, you do not have an acceptance command — fix the command rather than inventing a statement for it.
Short is fine — `non-zero exit` is complete. There is no minimum length and no required keyword.
<!-- vpmodule:atom:end name-the-signal-that-reveals-a-silent-no-op -->
<!-- vpmodule:atom:begin state-the-failing-direction-of-every-command -->
---
instruction_id: state-the-failing-direction-of-every-command
title: State the failing direction of every command
summary: "Every runnable command names the observable output that would show it failed, and the statement binds to the nearest preceding command."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A runnable verification command is written.
conditions_does_not_apply_when: The command is a placeholder that is not runnable.
artifact_contract_output_type: failing-direction-statement
artifact_contract_required_data:
  - the command
  - the observable failure signal
artifact_contract_verified_by: every runnable command has a statement that names an observable failure signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# State the failing direction of every command
Every runnable `<automated>` command needs a `<fails_when>` sibling naming an observable failure signal:
Within one `<task>`, each `<fails_when>` binds to the nearest **preceding** `<automated>`, and the first statement after a command is the binding one. Two commands need two statements.
<!-- vpmodule:atom:end state-the-failing-direction-of-every-command -->