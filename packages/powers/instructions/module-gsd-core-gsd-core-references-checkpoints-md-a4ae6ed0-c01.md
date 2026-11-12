---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-checkpoints-md-a4ae6ed0-c01"
title: "gsd-core: gsd-core/references/checkpoints.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/references/checkpoints.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/checkpoints.md\"}"
atom_ids:
  - ask-the-human-once-at-the-end-not-after-every-step
  - automate-everything-the-agent-can-do
  - fix-the-verification-environment-before-you-ask
  - never-auto-approve-a-decision-that-needs-a-human
  - treat-an-authentication-gate-as-a-blocker-not-a-failure
  - write-the-checkpoint-so-the-human-can-act
atom_count: 6
atoms: "[{\"atom_id\":\"ask-the-human-once-at-the-end-not-after-every-step\",\"file_sha256\":\"aefce252865ad5551fe3e2658c3b7ca5895d255c381301f15e49cb9a77be7698\",\"content_sha256\":\"384c3b8478b1794a23ad889be0ea43834fc16cc316e82c51953aee9a3398f2c1\",\"file_bytes\":1772,\"body_bytes\":480},{\"atom_id\":\"automate-everything-the-agent-can-do\",\"file_sha256\":\"54369e5bc2fa8b2bd3656bf79cba59c15a1b53f2a88136df08fa3b9165c5000b\",\"content_sha256\":\"4e328bd08af6ea58fbce2e3345fcd1a9f68354a5ba496fa26386359fc285e78c\",\"file_bytes\":1872,\"body_bytes\":684},{\"atom_id\":\"fix-the-verification-environment-before-you-ask\",\"file_sha256\":\"62868f54ff2b7fe2f280bf145c4184edb0dfd342eef5892fcbd6b3911bcf3a6b\",\"content_sha256\":\"a2284a6ef12782bb1c9bc05729a693dedde2b4767b2b160479f0aaa67ff61c84\",\"file_bytes\":1680,\"body_bytes\":479},{\"atom_id\":\"never-auto-approve-a-decision-that-needs-a-human\",\"file_sha256\":\"ad25154fa3cb950ed23feb38c82c3bc1027cd56d33b3e5c505aaf47df83fd9ca\",\"content_sha256\":\"44f3a990519947aefef7db5b8d23ee61a8ae183d44aa43fe3ef31b71e0c6723a\",\"file_bytes\":1587,\"body_bytes\":417},{\"atom_id\":\"treat-an-authentication-gate-as-a-blocker-not-a-failure\",\"file_sha256\":\"82a8b8f41d3dafe9aa2ccd22c8415024a4f803ad92e051578f6d293f03997540\",\"content_sha256\":\"ace3c2088706513745af42edc0f146d99d143da20894658fcb88d11f9ee2c322\",\"file_bytes\":1937,\"body_bytes\":687},{\"atom_id\":\"write-the-checkpoint-so-the-human-can-act\",\"file_sha256\":\"6592fd3791ebb03b5ef4e395209d3b39e983c45f318c0049fb195222a92a9d92\",\"content_sha256\":\"a844fa3496d6f9a2673edfe28886e02241c5526490586ef174065ba6ea81f5e6\",\"file_bytes\":1493,\"body_bytes\":374}]"
carrier_sha256: d6a48cb798e39cfbe4230c803ca96f680cab5d4eb3ebc536685b258720c25a64
carrier_bytes: 11242
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-the-human-once-at-the-end-not-after-every-step -->
---
instruction_id: ask-the-human-once-at-the-end-not-after-every-step
title: "Ask the human once at the end, not after every step"
summary: "The human is asked once, after the automated work is complete; a checkpoint after every step is verification fatigue."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A run contains several steps a human could be asked about.
conditions_does_not_apply_when: A step must be decided before the following step can run.
artifact_contract_output_type: checkpoint-placement
artifact_contract_required_data:
  - the single place the human is asked
  - the work that was automated first
  - the placement rule that was applied
artifact_contract_verified_by: "the human is asked once, after the automation, and not between every step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/executor-examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask the human once at the end, not after every step
Automate everything, then verify at the end
One checkpoint at end verifies the complete flow
BAD: Too many checkpoints / ✅ GOOD: Single checkpoint
Mix multiple verifications in one checkpoint
After automation completes - not before the agent does the work
After UI buildout - before declaring phase complete
Before dependent work - decisions before implementation
At integration points - after configuring external services
<!-- vpmodule:atom:end ask-the-human-once-at-the-end-not-after-every-step -->
<!-- vpmodule:atom:begin automate-everything-the-agent-can-do -->
---
instruction_id: automate-everything-the-agent-can-do
title: Automate everything the agent can do
summary: "Anything a command line, an API or a script can do is done by the agent; the human is asked only for what needs human judgement."
capability_tags:
  - automate-what-can-be-automated
pattern_tags:
  - human-in-the-loop
conditions_applies_when: "A step of the work has a command line, an API or a script that could perform it."
conditions_does_not_apply_when: "The step needs human judgement, or credentials only the human can supply."
artifact_contract_output_type: automated-step-list
artifact_contract_required_data:
  - the steps the agent runs itself
  - the steps left to the human
  - the reason each human step remains
artifact_contract_verified_by: no step with a command line or an API is handed over to the human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Automate everything the agent can do
The golden rule: If the agent CAN automate it, the agent MUST automate it.
Never ask user to execute CLI commands, start servers, or run builds
The agent sets up the verification environment - Start dev servers, seed databases, configure env vars
User only does what requires human judgment - Visual checks, UX evaluation, "does this feel right?"
Secrets come from user, automation comes from the agent - Ask for API keys, then the agent uses them via CLI
The rule: If it has CLI/API, the agent does it. Never ask human to perform automatable work.
Checkpoints formalize human-in-the-loop points for verification and decisions, not manual work.
<!-- vpmodule:atom:end automate-everything-the-agent-can-do -->
<!-- vpmodule:atom:begin fix-the-verification-environment-before-you-ask -->
---
instruction_id: fix-the-verification-environment-before-you-ask
title: Fix the verification environment before you ask the human
summary: "A checkpoint is never presented with a broken environment: the failure is repaired, or the checkpoint waits."
capability_tags:
  - automate-what-can-be-automated
pattern_tags:
  - verification-before-completion
conditions_applies_when: The environment a human would use to verify the work is not working yet.
conditions_does_not_apply_when: The environment works and only the judgement of the result is left to the human.
artifact_contract_output_type: environment-repair-record
artifact_contract_required_data:
  - the failure that was repaired
  - the repair
  - the check that shows the environment now works
artifact_contract_verified_by: the environment answers before the human is asked to look at it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Fix the verification environment before you ask the human
Never present a checkpoint with broken verification environment.
If the local server isn't responding, don't ask user to "visit localhost:3000".
Check error, fix issue, retry (don't proceed to checkpoint)
Kill stale process or use alternate port
Run `npm install`, retry
Fix the error first (bug, not checkpoint issue)
Retry with backoff, then checkpoint if persistent
Investigate error, fix root cause, restart server
<!-- vpmodule:atom:end fix-the-verification-environment-before-you-ask -->
<!-- vpmodule:atom:begin never-auto-approve-a-decision-that-needs-a-human -->
---
instruction_id: never-auto-approve-a-decision-that-needs-a-human
title: Never auto-approve a decision that needs a human
summary: "A checkpoint that exists because a human must decide something stops for a human in every mode; an undeclared default is escalated, never guessed."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "A step is unattended, or a decision has no declared default."
conditions_does_not_apply_when: The step is a verification the agent can judge from the evidence itself.
artifact_contract_output_type: escalation-decision
artifact_contract_required_data:
  - the step that needs a human
  - the reason it cannot be decided unattended
  - the options offered
artifact_contract_verified_by: the step stopped for a human and no default was guessed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never auto-approve a decision that needs a human
Irreversible or trust-establishing steps a human must actually see: package-legitimacy verification before install, any decision whose default answer would be wrong to assume
Stops for a human in auto-mode too.
Never bypassed.
Omit it and auto-mode escalates to a human instead of guessing from option order
human-action still stops (auth gates cannot be automated)
<!-- vpmodule:atom:end never-auto-approve-a-decision-that-needs-a-human -->
<!-- vpmodule:atom:begin treat-an-authentication-gate-as-a-blocker-not-a-failure -->
---
instruction_id: treat-an-authentication-gate-as-a-blocker-not-a-failure
title: "Treat an authentication gate as a blocker, not a failure"
summary: "A missing credential is an expected gate: the work stops once, the human is given the exact steps, and the original attempt is retried afterwards."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An automated attempt stopped because credentials were missing or rejected.
conditions_does_not_apply_when: The attempt failed for a reason that credentials do not explain.
artifact_contract_output_type: authentication-gate
artifact_contract_required_data:
  - the attempt that was blocked
  - the exact authentication steps
  - the check that shows the credential works
artifact_contract_verified_by: "the original attempt was retried after the human authenticated, and it succeeded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat an authentication gate as a blocker, not a failure
Auth gate = the agent tried CLI/API, got auth error. Not a failure — a gate requiring human input to unblock.
Recognize it's not a failure - missing auth is expected
Stop current task - don't retry repeatedly
Provide exact authentication steps
Verify authentication works
Retry the original task
Pre-planned checkpoint: "I need you to do X" (wrong - the agent should automate)
Auth gate: "I tried to automate X but need credentials" (correct - unblocks automation)
Auth gates are created dynamically when the agent encounters auth errors. NOT pre-planned — the agent automates first, asks for credentials only when blocked.
<!-- vpmodule:atom:end treat-an-authentication-gate-as-a-blocker-not-a-failure -->
<!-- vpmodule:atom:begin write-the-checkpoint-so-the-human-can-act -->
---
instruction_id: write-the-checkpoint-so-the-human-can-act
title: Write the checkpoint so the human can act
summary: "A checkpoint names the exact target, numbers the steps, states the expected outcome, says why it exists and how to continue."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - output-formatting
conditions_applies_when: A checkpoint is written for a human to act on.
conditions_does_not_apply_when: The step is fully automated and no human reads it.
artifact_contract_output_type: checkpoint-request
artifact_contract_required_data:
  - what was built
  - the numbered verification steps
  - the expected outcomes
  - the signal that continues the work
artifact_contract_verified_by: the human can act on the checkpoint without asking a further question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the checkpoint so the human can act
Be specific: "Visit https://myapp.vercel.app" not "check deployment"
Number verification steps
State expected outcomes: "You should see X"
Provide context: why this checkpoint exists
Assume knowledge: "Configure the usual settings"
Skip steps: "Set up database" (too vague)
How to continue - "approved", "yes", or describe issues
<!-- vpmodule:atom:end write-the-checkpoint-so-the-human-can-act -->