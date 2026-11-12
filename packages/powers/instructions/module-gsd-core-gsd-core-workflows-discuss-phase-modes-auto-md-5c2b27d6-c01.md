---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-discuss-phase-modes-auto-md-5c2b27d6-c01"
title: "gsd-core: gsd-core/workflows/discuss-phase/modes/auto.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/discuss-phase/modes/auto.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/discuss-phase/modes/auto.md\"}"
atom_ids:
  - complete-an-unattended-pass-once
  - log-the-choice-you-made-on-behalf-of-the-user
atom_count: 2
atoms: "[{\"atom_id\":\"complete-an-unattended-pass-once\",\"file_sha256\":\"05883a73b484c4e1773994db4e6c46682b657020b1bfc08898243941ed263021\",\"content_sha256\":\"d780990d6f78c5aa94535ce4f43d22adf6a3356b5434ef61be9a89ce9c129e2d\",\"file_bytes\":1421,\"body_bytes\":416},{\"atom_id\":\"log-the-choice-you-made-on-behalf-of-the-user\",\"file_sha256\":\"4b260d40792c458247367fa03b014f93a0f43bb9289f7fec8afdb17f14de24a2\",\"content_sha256\":\"29b31d12a63a26466a55435abb69d1ffa9590e50d9ac244846760e5e51c9d417\",\"file_bytes\":1578,\"body_bytes\":423}]"
carrier_sha256: f59d7cc79b75d4f49be8542395b31ed3632392402a3d9832bcf1469b21f93141
carrier_bytes: 3268
revision: 1
status: active
---
<!-- vpmodule:atom:begin complete-an-unattended-pass-once -->
---
instruction_id: complete-an-unattended-pass-once
title: Complete an unattended pass once
summary: An unattended run writes its output once and does not start a second pass over its own output.
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: An unattended run has already written its canonical output once.
conditions_does_not_apply_when: The run is interactive and the user is present to answer.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the completed pass
artifact_contract_verified_by: no second pass is started over the output the run has already written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/auto.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Complete an unattended pass once
In `--auto` mode, the discuss step MUST complete in a **single pass**.
Do NOT re-read your own
context document
to find "gaps", "undefined types", or "missing decisions" and run additional passes.
This creates a self-feeding loop where each pass generates references that the next pass treats as gaps, consuming unbounded time and resources.
the discuss step is complete. Move on.
<!-- vpmodule:atom:end complete-an-unattended-pass-once -->
<!-- vpmodule:atom:begin log-the-choice-you-made-on-behalf-of-the-user -->
---
instruction_id: log-the-choice-you-made-on-behalf-of-the-user
title: Log the choice you made on behalf of the user
summary: Every choice made without the user is written down where the user can audit it.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - unattended-execution
conditions_applies_when: A choice is made without asking the user.
conditions_does_not_apply_when: The user answered and the choice is theirs.
artifact_contract_output_type: decision-log
artifact_contract_required_data:
  - the question
  - the chosen option
  - the reason it was the default
artifact_contract_verified_by: every choice made without the user is written where the user can audit it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/auto.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/eval-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Log the choice you made on behalf of the user
for each discussion question, choose the recommended option (first option, or the one explicitly marked "recommended") **without using AskUserQuestion**. Skip interactive prompts entirely.
Log each auto-selected choice inline so the user can review decisions in the context file
Log every decision so the user can audit.
an unattended run reuses an existing artifact instead
<!-- vpmodule:atom:end log-the-choice-you-made-on-behalf-of-the-user -->