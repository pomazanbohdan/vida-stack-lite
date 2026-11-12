---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-offer-next-md-77905019-c01"
title: "gsd-core: gsd-core/references/offer-next.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/references/offer-next.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/offer-next.md\"}"
atom_ids:
  - do-not-auto-advance-without-the-flag
  - never-suggest-a-command-that-does-not-exist
  - offer-only-the-commands-that-exist
  - stop-and-offer-the-options-when-no-auto-mode-is-set
atom_count: 4
atoms: "[{\"atom_id\":\"do-not-auto-advance-without-the-flag\",\"file_sha256\":\"6c67253a02506d0a788c75aacb4950fbddc5cc8dd3e9608bc5921989319bb144\",\"content_sha256\":\"7ef2c9cdbd6acd1fea4b118835ddb9173fff46b0f81cd354be73f3d474ac07df\",\"file_bytes\":1434,\"body_bytes\":215},{\"atom_id\":\"never-suggest-a-command-that-does-not-exist\",\"file_sha256\":\"f431e8f147aea7cb0d54d8d4fa4c971063b9099cf3186a8dd07593bffcf36782\",\"content_sha256\":\"3f2ac81542db6eae1cccf8d4579b83367494975776d0dfa08d94b9890136feb7\",\"file_bytes\":1194,\"body_bytes\":130},{\"atom_id\":\"offer-only-the-commands-that-exist\",\"file_sha256\":\"a43274bbd34db5d52e93324c1beea3eb1a4e618527b6dab69d4fa6b919107c63\",\"content_sha256\":\"aeb15ae86f03a32c8831ce6b8455ccde1ed72c0c625b4c9b28cc2a40df457908\",\"file_bytes\":1100,\"body_bytes\":120},{\"atom_id\":\"stop-and-offer-the-options-when-no-auto-mode-is-set\",\"file_sha256\":\"54a5d907f4129228f09a585f6a97a0cc16e0f6aacb080116a0b0fa6c3e9256dd\",\"content_sha256\":\"193a6a5c8873fad3507261a95f9b33405a31c585a75ff40c5595af197c1b2fe4\",\"file_bytes\":1358,\"body_bytes\":236}]"
carrier_sha256: 84eba91a2fb35bed6224530bcb26ef3bb14e7953343850f9c4b088d11db234a0
carrier_bytes: 5645
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-auto-advance-without-the-flag -->
---
instruction_id: do-not-auto-advance-without-the-flag
title: Do not auto-advance without the flag
summary: The next phase is entered on its own only when the auto flag or the auto mode is set and the verification passed with no gaps; otherwise the run stops and the options are put to the user.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A phase is verified and the next step would move on to the following one.
conditions_does_not_apply_when: The auto flag is set and the verification passed with no gaps.
artifact_contract_output_type: advance-decision
artifact_contract_required_data:
  - the auto flag or the auto mode
  - the verification result
  - the options put to the user
artifact_contract_verified_by: the run stopped with the options presented unless the auto mode was set and the verification was clean
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not auto-advance without the flag
**If neither the auto flag nor the auto mode is true:**
**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**
<!-- vpmodule:atom:end do-not-auto-advance-without-the-flag -->
<!-- vpmodule:atom:begin never-suggest-a-command-that-does-not-exist -->
---
instruction_id: never-suggest-a-command-that-does-not-exist
title: Never suggest a command that does not exist
summary: "Only the routes that exist are offered; a command name is never invented or hallucinated, and an internal step is never offered as a command."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: The next step is presented to the user as a choice of routes.
conditions_does_not_apply_when: The route was named by the user.
artifact_contract_output_type: route-menu
artifact_contract_required_data:
  - the routes that exist
  - the route that is recommended
artifact_contract_verified_by: every offered route exists and the recommended one is marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never suggest a command that does not exist
Only suggest the commands listed above. Do not invent or hallucinate command names.
<!-- vpmodule:atom:end never-suggest-a-command-that-does-not-exist -->
<!-- vpmodule:atom:begin offer-only-the-commands-that-exist -->
---
instruction_id: offer-only-the-commands-that-exist
title: Offer only the commands that exist
summary: The offered commands are the ones that exist; a name that does not exist is never suggested.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - completion-criteria
conditions_applies_when: Options with commands are presented to the user.
conditions_does_not_apply_when: The option carries prose only and no command.
artifact_contract_output_type: option-list
artifact_contract_required_data:
  - the offered commands
  - the recommended one
artifact_contract_verified_by: every offered command is one of the listed commands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer only the commands that exist
Only suggest the commands listed above. Do not invent or hallucinate command names
<!-- vpmodule:atom:end offer-only-the-commands-that-exist -->
<!-- vpmodule:atom:begin stop-and-offer-the-options-when-no-auto-mode-is-set -->
---
instruction_id: stop-and-offer-the-options-when-no-auto-mode-is-set
title: Stop and offer the options when no auto mode is set
summary: "Without an auto mode the run stops after the current step, presents the options and waits."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A step finished and neither the auto flag nor the auto preference is set.
conditions_does_not_apply_when: The auto flag or the auto preference is set and the verification passed with no gaps.
artifact_contract_output_type: options-presented
artifact_contract_required_data:
  - the options presented
  - the recommendation
  - the wait for the choice
artifact_contract_verified_by: the run stopped and presented the options instead of advancing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop and offer the options when no auto mode is set
**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**
If CONTEXT.md does **not** exist for the next phase, present:
<!-- vpmodule:atom:end stop-and-offer-the-options-when-no-auto-mode-is-set -->