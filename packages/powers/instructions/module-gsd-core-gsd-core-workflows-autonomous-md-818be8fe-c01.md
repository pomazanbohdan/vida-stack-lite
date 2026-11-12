---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-autonomous-md-818be8fe-c01"
title: "gsd-core: gsd-core/workflows/autonomous.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/autonomous.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/autonomous.md\"}"
atom_ids:
  - branch-on-the-recorded-next-action-not-on-the-status-word
  - chain-the-review-and-the-fix-in-an-unattended-run
  - do-not-loop-a-step-whose-output-already-exists
  - re-read-the-plan-after-every-step
atom_count: 4
atoms: "[{\"atom_id\":\"branch-on-the-recorded-next-action-not-on-the-status-word\",\"file_sha256\":\"a2ea7db53f0a7e90e2bc359dea6dc3014a7f4b543920ce49c6ff50601b2463e0\",\"content_sha256\":\"545505fc21533e1cd2abca57b8d55d2eb2ae0b766f22afc276348550afc4821a\",\"file_bytes\":1305,\"body_bytes\":160},{\"atom_id\":\"chain-the-review-and-the-fix-in-an-unattended-run\",\"file_sha256\":\"78d6f1f74e2efcb2b4012919788ca72d53ec9ac920ac390d7f9d523f53569a75\",\"content_sha256\":\"fe4d6e43a25c98370fd01ea8f08d2bebdf5804af5a25fa573fa4a0105138d164\",\"file_bytes\":1380,\"body_bytes\":217},{\"atom_id\":\"do-not-loop-a-step-whose-output-already-exists\",\"file_sha256\":\"219f985cb3e075f4095a3fb74ce8dca89afdc747ce678a7ba0c142daddb1c0d2\",\"content_sha256\":\"6538fc7523cc2495598b73812b30f058f8b1af89e058774cf4907c15334cd1ff\",\"file_bytes\":1371,\"body_bytes\":257},{\"atom_id\":\"re-read-the-plan-after-every-step\",\"file_sha256\":\"56f7b77504a77bfc7a0dd3aa701469a68747da04534b565d33ef00ba4ffcb9ae\",\"content_sha256\":\"15382669839f0439ccf0640d402ce1f6a0e60368429eac47fa64c76b6823d2c6\",\"file_bytes\":1089,\"body_bytes\":98}]"
carrier_sha256: 43664c341f67c8b9ab36502e8f0b919953658f7b8160351c1b5649f5cfcd7932
carrier_bytes: 5746
revision: 1
status: active
---
<!-- vpmodule:atom:begin branch-on-the-recorded-next-action-not-on-the-status-word -->
---
instruction_id: branch-on-the-recorded-next-action-not-on-the-status-word
title: "Branch on the recorded next action, not on the status word"
summary: "When the run meets a state it does not recognise, it reads the recorded next action and follows it; it never decides from the status word alone."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The run meets a status it does not recognise or a route that is not a pass.
conditions_does_not_apply_when: The state is one of the known outcomes.
artifact_contract_output_type: next-action-route
artifact_contract_required_data:
  - the recorded next action
  - the route it produced
artifact_contract_verified_by: the route came from the recorded next action and not from the status word
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Branch on the recorded next action, not on the status word
A non-passed route after it is a real blocker
Branch on the owner's answer, never on a status word
<!-- vpmodule:atom:end branch-on-the-recorded-next-action-not-on-the-status-word -->
<!-- vpmodule:atom:begin chain-the-review-and-the-fix-in-an-unattended-run -->
---
instruction_id: chain-the-review-and-the-fix-in-an-unattended-run
title: Chain the review and the fix in an unattended run
summary: "An unattended run chains the review and the fix by itself, and a failure in either is reported and does not stop the chain."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A run works unattended over a body of work and no person asks for a review.
conditions_does_not_apply_when: The run is attended and the person decides what is reviewed.
artifact_contract_output_type: review-fix-chain
artifact_contract_required_data:
  - the review that ran
  - the fix that followed
  - the failures that were reported
artifact_contract_verified_by: the review and the fix ran unattended and a failure of either was reported without stopping the chain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Chain the review and the fix in an unattended run
Autonomous mode chains both review and fix
Auto-invoke the consolidated fix entry point
If either Skill fails, catch the error, display as non-blocking, and proceed
<!-- vpmodule:atom:end chain-the-review-and-the-fix-in-an-unattended-run -->
<!-- vpmodule:atom:begin do-not-loop-a-step-whose-output-already-exists -->
---
instruction_id: do-not-loop-a-step-whose-output-already-exists
title: Do not loop a step whose output already exists
summary: "A step that already produced its output is not run again, and the presence of that output decides the step is done even when the result looks incomplete."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A step has already produced its output and the run is tempted to repeat it.
conditions_does_not_apply_when: The output does not exist yet.
artifact_contract_output_type: step-presence-check
artifact_contract_required_data:
  - the output that exists
  - the decision not to repeat the step
artifact_contract_verified_by: the step ran once and the presence of its output was treated as authoritative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not loop a step whose output already exists
MUST NOT loop.
If CONTEXT.md already exists after discuss completes, do NOT re-invoke discuss for the same phase.
Once true, discuss is done for this phase regardless of perceived "gaps" in the context file.
<!-- vpmodule:atom:end do-not-loop-a-step-whose-output-already-exists -->
<!-- vpmodule:atom:begin re-read-the-plan-after-every-step -->
---
instruction_id: re-read-the-plan-after-every-step
title: Re-read the plan after every step
summary: "The plan is re-read after each unit of work, because an item inserted during the run changes what the next step should do."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run works through a sequence of items.
conditions_does_not_apply_when: The run is a single step.
artifact_contract_output_type: plan-reread-record
artifact_contract_required_data:
  - the plan as re-read
  - the items it now contains
artifact_contract_verified_by: the plan was re-read after each step and the queue was taken from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-read the plan after every step
ROADMAP.md re-read after each phase (catches inserted phases)
<!-- vpmodule:atom:end re-read-the-plan-after-every-step -->