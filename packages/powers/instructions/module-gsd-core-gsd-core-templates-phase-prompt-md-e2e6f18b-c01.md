---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-phase-prompt-md-e2e6f18b-c01"
title: "gsd-core: gsd-core/templates/phase-prompt.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/templates/phase-prompt.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/phase-prompt.md\"}"
atom_ids:
  - cover-every-roadmap-requirement-in-at-least-one-plan
  - derive-the-must-haves-goal-backward
  - escalate-only-what-the-agent-cannot-do
  - name-the-files-to-read-before-modifying-them
  - reference-a-prior-summary-only-when-it-is-needed
  - write-an-action-with-concrete-values-not-alignments
atom_count: 6
atoms: "[{\"atom_id\":\"cover-every-roadmap-requirement-in-at-least-one-plan\",\"file_sha256\":\"fae04897d98bb0d1322bd8e50e875ce7235b53fd4f98ee140c12d9a74741009d\",\"content_sha256\":\"752336aa26b2264a213ff617567197732b1225ce8a717dd4b182e95018f25ee7\",\"file_bytes\":1372,\"body_bytes\":195},{\"atom_id\":\"derive-the-must-haves-goal-backward\",\"file_sha256\":\"bad5f8d914114327532ddc9d373c201ec513b491ac62b8e640117b41efeb1ce4\",\"content_sha256\":\"c603b2115fa86bd71525f8846616bafeb37a789418f99f069a0b084727723a80\",\"file_bytes\":1273,\"body_bytes\":262},{\"atom_id\":\"escalate-only-what-the-agent-cannot-do\",\"file_sha256\":\"79b54ca7efeb4e2a1fa45c9e5870e7c322ffd3632af1272ccc61cec38b6657ac\",\"content_sha256\":\"8ec0ebce98692fd75cc87fb2b2478280b7b4d5c024e3a5212fa5996ddb9e18dc\",\"file_bytes\":1712,\"body_bytes\":364},{\"atom_id\":\"name-the-files-to-read-before-modifying-them\",\"file_sha256\":\"d439e3c22cdb7eb73999074dd3c7cc4e626ce72f507d163edcd1436af67d543f\",\"content_sha256\":\"4cc07f0e6b3e12dd425865d582e176f527381615f8b3a663ecf13007ad851f70\",\"file_bytes\":1185,\"body_bytes\":167},{\"atom_id\":\"reference-a-prior-summary-only-when-it-is-needed\",\"file_sha256\":\"aa38907ec6e4a050a9976a21d4cef74c469564cdd1de8d80c31533c13b1cb764\",\"content_sha256\":\"e02121d227aa8e9d4ad4b2b96c5669c2ed96eb6e3b2fa2766cac58b23fed31dd\",\"file_bytes\":1320,\"body_bytes\":262},{\"atom_id\":\"write-an-action-with-concrete-values-not-alignments\",\"file_sha256\":\"6cd1e39991890d564b802f5fea8128fcd00885f7dc13f10c6d631a6e05ec1a52\",\"content_sha256\":\"35df9eaaf1b499d04120b99342e9a9e10dbf023aaebc3d12ad831cd9d0e9dea7\",\"file_bytes\":1313,\"body_bytes\":230}]"
carrier_sha256: 991313b2c941747421efce775649c50e25d6eb0048062e64bc0ea3c0dcb6996d
carrier_bytes: 9058
revision: 1
status: active
---
<!-- vpmodule:atom:begin cover-every-roadmap-requirement-in-at-least-one-plan -->
---
instruction_id: cover-every-roadmap-requirement-in-at-least-one-plan
title: Cover every roadmap requirement in at least one plan
summary: Every requirement of the roadmap appears in at least one plan; an unmapped requirement is a gap in the roadmap.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A phase is broken into plans.
conditions_does_not_apply_when: The phase has no roadmap requirements.
artifact_contract_output_type: requirement-coverage
artifact_contract_required_data:
  - the requirement identifiers each plan covers
artifact_contract_verified_by: every roadmap requirement appears in at least one plan and the unmapped count is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Cover every roadmap requirement in at least one plan
**MUST** list requirement IDs from ROADMAP. Every roadmap requirement MUST appear in at least one plan.
Unmapped requirements = roadmap gap
<!-- vpmodule:atom:end cover-every-roadmap-requirement-in-at-least-one-plan -->
<!-- vpmodule:atom:begin derive-the-must-haves-goal-backward -->
---
instruction_id: derive-the-must-haves-goal-backward
title: Derive the must-haves goal-backward
summary: "The criteria are derived from the goal, because a finished task is not an achieved goal."
capability_tags:
  - plan-implementation
pattern_tags:
  - working-backwards
conditions_applies_when: The verification criteria of a plan are written.
conditions_does_not_apply_when: The criteria are given by the caller.
artifact_contract_output_type: must-haves
artifact_contract_required_data:
  - the observable truths
  - the artifacts
  - the connections between them
artifact_contract_verified_by: the criteria are derived from the goal and name what must actually work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Derive the must-haves goal-backward
Task completion ≠ Goal achievement. A task "create chat component" can complete by creating a placeholder.
The `must_haves` field captures what must actually work, enabling verification to catch gaps before they compound.
<!-- vpmodule:atom:end derive-the-must-haves-goal-backward -->
<!-- vpmodule:atom:begin escalate-only-what-the-agent-cannot-do -->
---
instruction_id: escalate-only-what-the-agent-cannot-do
title: Escalate only what the agent cannot do
summary: "The handover to a human contains account creation, secret retrieval and dashboard configuration and nothing else."
capability_tags:
  - author-setup-scripts
pattern_tags:
  - scope-routing
conditions_applies_when: A piece of work needs an external service.
conditions_does_not_apply_when: "The external service needs no account, secret or dashboard configuration."
artifact_contract_output_type: human-setup-list
artifact_contract_required_data:
  - the environment variables and their sources
  - the dashboard configuration steps
artifact_contract_verified_by: every listed item needs a human in a browser and no automatable step is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/user-setup.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/user-setup.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Escalate only what the agent cannot do
**The automation-first rule:** `user_setup` contains ONLY what Claude literally cannot do:
Account creation (requires human signup)
Secret retrieval (requires dashboard access)
Dashboard configuration (requires human in browser)
**NOT included:** Package installs, code changes, file creation, CLI commands Claude can run.
<!-- vpmodule:atom:end escalate-only-what-the-agent-cannot-do -->
<!-- vpmodule:atom:begin name-the-files-to-read-before-modifying-them -->
---
instruction_id: name-the-files-to-read-before-modifying-them
title: Name the files to read before modifying them
summary: "A task that will change a file names the files to read first, so the implementer knows the current state and the conventions."
capability_tags:
  - execute-plan
pattern_tags:
  - implementation-planning
conditions_applies_when: A task will modify an existing file.
conditions_does_not_apply_when: The task creates a new file from scratch.
artifact_contract_output_type: task-read-first
artifact_contract_required_data:
  - the files to read before the change
artifact_contract_verified_by: the task names the files to read before it modifies anything
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the files to read before modifying them
**Bad: Missing read_first (executor modifies files it hasn't read)**
Executor doesn't know current state or conventions
<!-- vpmodule:atom:end name-the-files-to-read-before-modifying-them -->
<!-- vpmodule:atom:begin reference-a-prior-summary-only-when-it-is-needed -->
---
instruction_id: reference-a-prior-summary-only-when-it-is-needed
title: Reference a prior summary only when it is needed
summary: "A prior plan is read only when this plan uses its types, its decision or its output; the chain is not built by reflex."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The context of a plan is assembled.
conditions_does_not_apply_when: The plan is the first in its wave.
artifact_contract_output_type: plan-context
artifact_contract_required_data:
  - the prior plans that are genuinely needed
  - the reason each is needed
artifact_contract_verified_by: no prior summary is referenced without a stated need
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference a prior summary only when it is needed
Only reference prior plan SUMMARYs if genuinely needed:
This plan uses types/exports from prior plan
Prior plan made decision that affects this plan
Do NOT reflexively chain: Plan 02 refs 01, Plan 03 refs 02...
<!-- vpmodule:atom:end reference-a-prior-summary-only-when-it-is-needed -->
<!-- vpmodule:atom:begin write-an-action-with-concrete-values-not-alignments -->
---
instruction_id: write-an-action-with-concrete-values-not-alignments
title: "Write an action with concrete values, not alignments"
summary: "An action names the exact identifiers, parameters, outputs, paths and arguments; \"align X with Y\" is not an action."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A task action is written for the implementer.
conditions_does_not_apply_when: The action is a mechanical edit with a fixed value.
artifact_contract_output_type: task-action
artifact_contract_required_data:
  - the exact identifiers
  - the parameters
  - the expected output
artifact_contract_verified_by: the action names concrete values instead of an alignment between two things
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write an action with concrete values, not alignments
Include CONCRETE values: exact identifiers, parameters, expected outputs, file paths, command arguments. Never say "align X with Y" without specifying the exact target state.
<!-- vpmodule:atom:end write-an-action-with-concrete-values-not-alignments -->