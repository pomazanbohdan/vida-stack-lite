---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-debug-md-740fc573-c01"
title: "gsd-core: gsd-core/templates/DEBUG.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/templates/DEBUG.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/DEBUG.md\"}"
atom_ids:
  - declare-which-sections-are-overwritten-and-which-are-append-only
  - name-the-next-action-concretely
  - require-human-confirmation-before-you-mark-a-fix-resolved
atom_count: 3
atoms: "[{\"atom_id\":\"declare-which-sections-are-overwritten-and-which-are-append-only\",\"file_sha256\":\"797e654170656000e8df4e8561fd35742e5546b47d409b050079dc52fc7c56e1\",\"content_sha256\":\"471710d3baac837534708e9fbf276d5e397fa3297bafdb95975d0d8c7eaae327\",\"file_bytes\":1635,\"body_bytes\":518},{\"atom_id\":\"name-the-next-action-concretely\",\"file_sha256\":\"ee5b75bdb54f99dcb1c7cfe8012beaee6c3a5768ee83736cae70dce6a92787eb\",\"content_sha256\":\"c89b6c3f572164eadf50d7c46de658127cb69a0453b6430af634352191af16b0\",\"file_bytes\":1151,\"body_bytes\":201},{\"atom_id\":\"require-human-confirmation-before-you-mark-a-fix-resolved\",\"file_sha256\":\"1c2529a4dfa17312ab4e351fa903316d9e9d1b826cba00b45013a0c31d1b7ca0\",\"content_sha256\":\"7bcb922137b82334a4158cd3ccad29cb85ba5eea36f2c473b9c6bc7f2616ae2b\",\"file_bytes\":1254,\"body_bytes\":220}]"
carrier_sha256: dbff7165c5e05059932084096f44f6baca842fc110aa532f5792f95a843b6f7d
carrier_bytes: 4517
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-which-sections-are-overwritten-and-which-are-append-only -->
---
instruction_id: declare-which-sections-are-overwritten-and-which-are-append-only
title: Declare which sections are overwritten and which are append-only
summary: "Each section of the session file declares whether it is overwritten, appended to or frozen, so a resumed run knows what it may rewrite."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A long-running session is written to a file that a later run will read.
conditions_does_not_apply_when: The file is written once and never read again.
artifact_contract_output_type: session-file-sections
artifact_contract_required_data:
  - each section
  - the rule that governs it
artifact_contract_verified_by: "each section states whether it is overwritten, appended to or frozen"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/DEBUG.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Declare which sections are overwritten and which are append-only
**Current Focus:** - OVERWRITE entirely on each update - Always reflects what Claude is doing RIGHT NOW
**Symptoms:** - Written during initial gathering phase - IMMUTABLE after gathering complete
**Eliminated:** - APPEND only - never remove entries - Prevents re-investigating dead ends after context reset
**Evidence:** - APPEND only - never remove entries - Facts discovered during investigation
**Resolution:** - OVERWRITE as understanding evolves
<!-- vpmodule:atom:end declare-which-sections-are-overwritten-and-which-are-append-only -->
<!-- vpmodule:atom:begin name-the-next-action-concretely -->
---
instruction_id: name-the-next-action-concretely
title: Name the next action concretely
summary: "The next action is a specific step with a location, not a phrase such as \"continue investigating\"."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: The current focus of a session is recorded.
conditions_does_not_apply_when: The session has no next step.
artifact_contract_output_type: next-action
artifact_contract_required_data:
  - the concrete next step
  - the place it happens
artifact_contract_verified_by: the next action names a concrete step and a location
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/DEBUG.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name the next action concretely
`next_action`: must be concrete and actionable — bad: "continue investigating"; good: "Add logging at line 47 of auth.js to observe token value before jwt.verify()"
<!-- vpmodule:atom:end name-the-next-action-concretely -->
<!-- vpmodule:atom:begin require-human-confirmation-before-you-mark-a-fix-resolved -->
---
instruction_id: require-human-confirmation-before-you-mark-a-fix-resolved
title: Require human confirmation before you mark a fix resolved
summary: A self-verified fix waits for an explicit human confirmation before it is recorded as resolved.
capability_tags:
  - debug-root-cause
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A fix has passed its own verification.
conditions_does_not_apply_when: No fix has been verified yet.
artifact_contract_output_type: fix-closure
artifact_contract_required_data:
  - the state before confirmation
  - the state after it
artifact_contract_verified_by: the fix is only recorded as resolved after an explicit human confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/DEBUG.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Require human confirmation before you mark a fix resolved
**After self-verification passes:** - status -> "awaiting_human_verify" - Request explicit user confirmation in a checkpoint - Do NOT move file to resolved yet
<!-- vpmodule:atom:end require-human-confirmation-before-you-mark-a-fix-resolved -->