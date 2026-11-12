---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-do-md-e0d4789b-c01"
title: "gsd-core: gsd-core/workflows/do.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/do.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/do.md\"}"
atom_ids:
  - confirm-the-route-before-you-dispatch
  - forward-only-the-arguments-the-target-accepts
  - order-the-routing-rules-most-specific-first
atom_count: 3
atoms: "[{\"atom_id\":\"confirm-the-route-before-you-dispatch\",\"file_sha256\":\"9e6cdb96da50c160b98fb755b90e65ba414f3f1491e257f6d277f57abde19559\",\"content_sha256\":\"a76db7f03260507ed0aeba6c69868f6c59162aa3e156284f79bc74933a759f4f\",\"file_bytes\":1382,\"body_bytes\":361},{\"atom_id\":\"forward-only-the-arguments-the-target-accepts\",\"file_sha256\":\"6d7680c2aca5f1e800ad7784b58b9ab090fe20dfabfe4585476eb033c0316bc0\",\"content_sha256\":\"0ce9c02edf050340859e493a080d041f35fde2650de9a9242e4a7ed1ca795551\",\"file_bytes\":1386,\"body_bytes\":323},{\"atom_id\":\"order-the-routing-rules-most-specific-first\",\"file_sha256\":\"2557cd75cad63e8a895a280c53485e4754b83e3ea243aa440177afb9c1f92dc2\",\"content_sha256\":\"24cad346a0aaad49e65d0cbd81b7e1f802d5c0bdb0724b65ccb2e31dfbeaa8a2\",\"file_bytes\":1395,\"body_bytes\":342}]"
carrier_sha256: 122bad757693052baef0f19d8c26a8e4e0b519d3a28a044715393398292f7739
carrier_bytes: 4586
revision: 1
status: active
---
<!-- vpmodule:atom:begin confirm-the-route-before-you-dispatch -->
---
instruction_id: confirm-the-route-before-you-dispatch
title: Confirm the route before you dispatch
summary: The chosen route is shown and confirmed before anything is invoked.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A route to a target operation has been chosen but nothing has been invoked yet.
conditions_does_not_apply_when: The route was already confirmed in an earlier turn of the same run.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the chosen target
  - the reason
  - the confirmation
artifact_contract_verified_by: the user confirmed the route before anything was invoked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/do.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Confirm the route before you dispatch
Before invoking anything, ask the user to confirm the displayed route
Routing decision displayed before dispatch
**Cancel:** stop. Do not invoke any command.
**Choose a different command:** present the 2-3 next-best routes from the routing table as options and loop back through display + confirm with the new selection.
<!-- vpmodule:atom:end confirm-the-route-before-you-dispatch -->
<!-- vpmodule:atom:begin forward-only-the-arguments-the-target-accepts -->
---
instruction_id: forward-only-the-arguments-the-target-accepts
title: Forward only the arguments the target accepts
summary: Only the arguments the target accepts are forwarded; the freeform sentence is never passed whole.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A target operation is about to be invoked with arguments taken from a freeform request.
conditions_does_not_apply_when: The arguments are already a bare identifier the target accepts.
artifact_contract_output_type: dispatch-request
artifact_contract_required_data:
  - the arguments the target accepts
  - the extracted values
artifact_contract_verified_by: the freeform sentence was not forwarded whole
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/do.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Forward only the arguments the target accepts
**Invoke the chosen command with only the arguments it accepts.**
Do NOT pass the full freeform sentence wholesale.
extract the phase number / flags from the input; if none was provided, extract it from context
If the command takes no arguments, invoke it without arguments.
<!-- vpmodule:atom:end forward-only-the-arguments-the-target-accepts -->
<!-- vpmodule:atom:begin order-the-routing-rules-most-specific-first -->
---
instruction_id: order-the-routing-rules-most-specific-first
title: Order the routing rules most-specific first
summary: The first matching rule decides the route; a generic keyword never preempts a specific operation.
capability_tags:
  - coordinate-program
pattern_tags:
  - scope-routing
conditions_applies_when: A freeform request matches more than one rule of a routing table.
conditions_does_not_apply_when: Exactly one rule matches and no generic rule also matches.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the matched rule
  - the reason it wins
artifact_contract_verified_by: the first matching rule decided the route and a generic rule did not preempt a specific one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/do.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Order the routing rules most-specific first
Rules are ordered **most-specific first**: apply the **first matching** rule, and never let a generic keyword rule ("set up", "spike", "review") preempt a more specific operation that also matches ("set up this existing codebase", "wrap up the spike findings", "review the changed source code").
<!-- vpmodule:atom:end order-the-routing-rules-most-specific-first -->