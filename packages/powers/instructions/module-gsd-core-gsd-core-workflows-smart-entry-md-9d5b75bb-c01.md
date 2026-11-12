---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-smart-entry-md-9d5b75bb-c01"
title: "gsd-core: gsd-core/workflows/smart-entry.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/smart-entry.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/smart-entry.md\"}"
atom_ids:
  - never-strand-the-user-when-the-detection-fails
  - route-to-one-command-and-stop
atom_count: 2
atoms: "[{\"atom_id\":\"never-strand-the-user-when-the-detection-fails\",\"file_sha256\":\"141ba091f956efdfba0d31a1e834fecc03aa12999ba1331b7e0bba2b40909887\",\"content_sha256\":\"8ebcee123a64aa4f05674be8cfd8c07fa42176a03cc42e261701d219e8835ea5\",\"file_bytes\":1683,\"body_bytes\":502},{\"atom_id\":\"route-to-one-command-and-stop\",\"file_sha256\":\"b8c312793a3be652cb18384be7fd831ee6fa7c8172aa4d57972de2f625000f0a\",\"content_sha256\":\"05df2516a2204221a65025025b9a03a224fb8de6394afd99741dd17fb8412bb7\",\"file_bytes\":1546,\"body_bytes\":424}]"
carrier_sha256: 23895592c54f4321034ed6a3c43b34be0b18c7d1cd6536fa074c5d2cdcd76674
carrier_bytes: 3494
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-strand-the-user-when-the-detection-fails -->
---
instruction_id: never-strand-the-user-when-the-detection-fails
title: Never strand the user when the detection fails
summary: "When the situation cannot be detected, the run falls back to reading the state directly or to the progress route, and never errors out and leaves the user without a next step."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The detection of the current situation can fail or return nothing usable.
conditions_does_not_apply_when: The detection always returns a usable result.
artifact_contract_output_type: fallback-routing
artifact_contract_required_data:
  - the failure of the detection
  - the recovery that was applied
  - the line the user was shown
artifact_contract_verified_by: the user was told what happened and given a route forward
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/smart-entry.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Never strand the user when the detection fails
**Fallback (never strand the user):** `smart-entry --json` can fail for two reasons, and each has a different recovery.
Parse `SNAPSHOT`; if it is empty, not valid JSON, or missing `actions`, apply the first matching recovery below — do NOT error.
**Recover by reading state directly:**
Print one line first: `smart-entry unavailable (gsd-tools error) — reading state directly.`
Print one line first: `smart-entry unavailable — showing progress.`
<!-- vpmodule:atom:end never-strand-the-user-when-the-detection-fails -->
<!-- vpmodule:atom:begin route-to-one-command-and-stop -->
---
instruction_id: route-to-one-command-and-stop
title: Route to one command and stop
summary: "A front door detects the situation, offers the right next actions and dispatches exactly one of them; the dispatched command owns everything after that."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - program-orchestration
conditions_applies_when: An entry point must decide what happens next and hand the work over.
conditions_does_not_apply_when: The entry point is also the place where the work is done.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the situation
  - the actions offered
  - the command that was dispatched
artifact_contract_verified_by: exactly one command was dispatched and the entry point did no work of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/smart-entry.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Route to one command and stop
This is a launcher/router only; it never does the work itself.
Invoke the chosen action's `command`.
After invoking the command, **stop**. The dispatched command owns everything from here. Do not continue, do not chain, do not re-enter this workflow.
Show the `summary` line to orient the user, then offer the actions.
The recommended action is already first; surface it as the first option.
<!-- vpmodule:atom:end route-to-one-command-and-stop -->