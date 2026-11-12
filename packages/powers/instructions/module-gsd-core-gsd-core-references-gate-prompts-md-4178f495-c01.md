---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-gate-prompts-md-4178f495-c01"
title: "gsd-core: gsd-core/references/gate-prompts.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/gate-prompts.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/gate-prompts.md\"}"
atom_ids:
  - keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer
  - offer-real-choices-not-a-let-the-agent-decide-cop-out
atom_count: 2
atoms: "[{\"atom_id\":\"keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer\",\"file_sha256\":\"f88de6966e638f9fe4f3321e85011db241ab6b29f7957d8f6b088ea49109c9a4\",\"content_sha256\":\"521fb593cb0aa99242a52c852da6705bd3c86407d46ccb20ebbf451798bbfe4b\",\"file_bytes\":1390,\"body_bytes\":299},{\"atom_id\":\"offer-real-choices-not-a-let-the-agent-decide-cop-out\",\"file_sha256\":\"f3ae56e49d15941be65e05b8aabf4bc45a78fb439cf7fa97d8e99003fd12de43\",\"content_sha256\":\"036b7dcfb675a618a0962c6a3dc297329c615f3b2e5059b10898f43701bc73f8\",\"file_bytes\":1366,\"body_bytes\":269}]"
carrier_sha256: 3eec99848560c1dcc148cc873ad781548ce49818d3bc80d43698a67dff1cff58
carrier_bytes: 3109
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer -->
---
instruction_id: keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer
title: Keep a gate prompt to four options and handle the free-text answer
summary: "A gate prompt offers at most four options, allows one answer only, and always handles the free-text answer the user typed instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A gate asks the user to choose.
conditions_does_not_apply_when: The question is asked in free prose.
artifact_contract_output_type: gate-prompt
artifact_contract_required_data:
  - the question
  - the options
  - the handling of the free-text answer
artifact_contract_verified_by: the prompt offers at most four options and handles the typed answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/gate-prompts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Keep a gate prompt to four options and handle the free-text answer
Always handle the "Other" case (user typed a freeform response instead of selecting)
Max 4 options per prompt -- if more are needed, use a 2-step flow
multiSelect is always `false` for gate checks
header must be max 12 characters
<!-- vpmodule:atom:end keep-a-gate-prompt-to-four-options-and-handle-the-free-text-answer -->
<!-- vpmodule:atom:begin offer-real-choices-not-a-let-the-agent-decide-cop-out -->
---
instruction_id: offer-real-choices-not-a-let-the-agent-decide-cop-out
title: "Offer real choices, not a \"let the agent decide\" cop-out"
summary: "A decision prompt offers the real choices; it never offers to decide for the user, and a free-text escape is allowed instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A prompt asks the user to choose between options.
conditions_does_not_apply_when: The prompt asks a question that has no alternatives.
artifact_contract_output_type: choice-prompt
artifact_contract_required_data:
  - the real options
  - the escape offered
  - what the prompt refuses to offer
artifact_contract_verified_by: no option delegates the decision back to the agent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/gate-prompts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Offer real choices, not a "let the agent decide" cop-out
Present real choices only — do NOT include a "skip" or "you decide" option (the user ran discuss-phase to decide).
An "Other" free-text escape hatch may be offered
but never a "Let the agent decide" cop-out.
<!-- vpmodule:atom:end offer-real-choices-not-a-let-the-agent-decide-cop-out -->