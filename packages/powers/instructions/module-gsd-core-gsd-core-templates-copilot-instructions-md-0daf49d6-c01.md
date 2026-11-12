---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-copilot-instructions-md-0daf49d6-c01"
title: "gsd-core: gsd-core/templates/copilot-instructions.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/copilot-instructions.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/copilot-instructions.md\"}"
atom_ids:
  - apply-the-method-only-on-an-explicit-request
  - offer-the-next-step-until-the-user-says-they-are-done
atom_count: 2
atoms: "[{\"atom_id\":\"apply-the-method-only-on-an-explicit-request\",\"file_sha256\":\"77d97e29bcda767f1d1dceeb1d965e188dbab3bf8851bc9ec2641eb423262a6b\",\"content_sha256\":\"4f2a5e29fc0e265fe5d98f872fc1e6317411ba5150730993e5c627d46dafec4e\",\"file_bytes\":1093,\"body_bytes\":116},{\"atom_id\":\"offer-the-next-step-until-the-user-says-they-are-done\",\"file_sha256\":\"df5082d3359e6085416241b16dd99abc4890799747056efee54dba3ef4cf7ea1\",\"content_sha256\":\"cf968b0c38b75278d1b838931a01bbc77f216e8a57131db84f10b592e94a62ea\",\"file_bytes\":1356,\"body_bytes\":288}]"
carrier_sha256: a50ab68f9f175c5d4c2301310e11893ac5cd4241d6c2b48e56dcbb7c7d748de0
carrier_bytes: 2758
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-method-only-on-an-explicit-request -->
---
instruction_id: apply-the-method-only-on-an-explicit-request
title: Apply the method only on an explicit request
summary: The workflow runs only when the user asks for it; an unasked invocation changes nothing.
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: The method could be run on the current request.
conditions_does_not_apply_when: The user asked for the method.
artifact_contract_output_type: invocation-decision
artifact_contract_required_data:
  - the request that triggered the run
artifact_contract_verified_by: the run happened because the request asked for it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/copilot-instructions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Apply the method only on an explicit request
Do not apply the workflows unless the user explicitly asks for them.
<!-- vpmodule:atom:end apply-the-method-only-on-an-explicit-request -->
<!-- vpmodule:atom:begin offer-the-next-step-until-the-user-says-they-are-done -->
---
instruction_id: offer-the-next-step-until-the-user-says-they-are-done
title: Offer the next step until the user says they are done
summary: After the work the next step is offered and the loop repeats until the user says they are finished.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A deliverable has been completed.
conditions_does_not_apply_when: The user has already said they are done.
artifact_contract_output_type: next-step-offer
artifact_contract_required_data:
  - the next step that was offered
  - the answer the user gave
artifact_contract_verified_by: the next step was offered and the loop continued until the user indicated they were done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/copilot-instructions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer the next step until the user says they are done
After completing any command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting; repeat this feedback loop until the user explicitly indicates they are done.
<!-- vpmodule:atom:end offer-the-next-step-until-the-user-says-they-are-done -->