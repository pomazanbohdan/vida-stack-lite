---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-spec-md-5cd5abe7-c01"
title: "gsd-core: gsd-core/templates/spec.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/templates/spec.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/spec.md\"}"
atom_ids:
  - ground-the-background-in-the-code-reality
  - keep-an-interview-log-as-evidence-of-discovery
  - make-every-acceptance-criterion-resolve-to-pass-or-fail
  - make-every-requirement-falsifiable
  - mark-an-under-specified-dimension-as-an-assumption
  - state-the-goal-as-a-change-from-a-to-b
  - update-the-locked-spec-before-reopening-the-discussion
  - write-each-requirement-as-current-target-acceptance
atom_count: 8
atoms: "[{\"atom_id\":\"ground-the-background-in-the-code-reality\",\"file_sha256\":\"525470a163f3f59afd1c5802fb39f7b5f6406da7229d25b906f052e19a8fb76e\",\"content_sha256\":\"fecb44dbab3ebcb1f2bd0ad6e297bba54af42622136ebb06f3e98336037bfdd5\",\"file_bytes\":1363,\"body_bytes\":200},{\"atom_id\":\"keep-an-interview-log-as-evidence-of-discovery\",\"file_sha256\":\"2eae57e8139a653bccd2199878267ecbfdb38d0dee77169e0b9d5dc3554907f8\",\"content_sha256\":\"6abcc1e37755b799e105e4cb2d612a5f7d61b079d8cd885524b98d01f0199946\",\"file_bytes\":1162,\"body_bytes\":168},{\"atom_id\":\"make-every-acceptance-criterion-resolve-to-pass-or-fail\",\"file_sha256\":\"61a7a5e344dffcd8d18e9dd844a2db58d1d2d7ce5bd59c11b94e0543a6b603dd\",\"content_sha256\":\"cb6ec505f04f6274a18da6100d9a93a014db82f8aea8b2de91878cd3e720535c\",\"file_bytes\":1211,\"body_bytes\":229},{\"atom_id\":\"make-every-requirement-falsifiable\",\"file_sha256\":\"b66285a7b682e1f4174864b5977840ca45fd69cf3aaeefa0588390f2f31b0460\",\"content_sha256\":\"f1f2e3b39154c9855e7ea8bc95cbd35da954e6e594f0fc77cbafea6ea07a0fd5\",\"file_bytes\":1190,\"body_bytes\":203},{\"atom_id\":\"mark-an-under-specified-dimension-as-an-assumption\",\"file_sha256\":\"ab427de9852460ffdf71d488e7f39ce264eeed5c1dde14ef1366aa5dd4ef6c15\",\"content_sha256\":\"e65da2d6606176d28d93d03d65715349e1597158e72392d66764ea5a58d2efb6\",\"file_bytes\":1260,\"body_bytes\":239},{\"atom_id\":\"state-the-goal-as-a-change-from-a-to-b\",\"file_sha256\":\"c5b96ba5dd8b8324bf4a35d556546eb4320cb959f8e18a7e8a74f51a7ef2fa48\",\"content_sha256\":\"45801fdafefdf2215c9502d92bd640f757b350535e960f69da4aae78ca8e1fe6\",\"file_bytes\":1093,\"body_bytes\":146},{\"atom_id\":\"update-the-locked-spec-before-reopening-the-discussion\",\"file_sha256\":\"0d7df252d5395b442e594a4e397dd1511bd9e43adc00b665779198cfd1af9c57\",\"content_sha256\":\"bf65f1830a3a659a095bd7beb123695b0ff1b1e7c378b6da4b08d874dfb0e1fc\",\"file_bytes\":1299,\"body_bytes\":261},{\"atom_id\":\"write-each-requirement-as-current-target-acceptance\",\"file_sha256\":\"08ac9a200bd2faa017abb038f8e4d0051bbe4d2e005941f118118564c7664961\",\"content_sha256\":\"6097ff3e609e49f597f32f221d1f6758584acd73fdfd11a43c9ca557c648bfae\",\"file_bytes\":1467,\"body_bytes\":307}]"
carrier_sha256: 98ad9104ad92ecb829ad80e1c813a1c7dfa27281d24c035cafbee230b496f03a
carrier_bytes: 11246
revision: 1
status: active
---
<!-- vpmodule:atom:begin ground-the-background-in-the-code-reality -->
---
instruction_id: ground-the-background-in-the-code-reality
title: Ground the background in the code reality
summary: "The background states what exists today, what is broken and what triggers the work."
capability_tags:
  - clarify-requirements
pattern_tags:
  - concrete-trigger
conditions_applies_when: The background of a piece of work is written.
conditions_does_not_apply_when: The background is already recorded from the code.
artifact_contract_output_type: background-statement
artifact_contract_required_data:
  - the current state
  - the trigger for the work
artifact_contract_verified_by: the background names what exists today and what triggered the work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body is one bracketed background-field fragment, not a complete principle, conditional rule, ordered procedure, or set of checks; inventing omitted instruction content would be required."
---

# Ground the background in the code reality
[Current state from codebase — what exists today, what's broken or missing, what triggers this work. Grounded in code reality, not abstract description.]
<!-- vpmodule:atom:end ground-the-background-in-the-code-reality -->
<!-- vpmodule:atom:begin keep-an-interview-log-as-evidence-of-discovery -->
---
instruction_id: keep-an-interview-log-as-evidence-of-discovery
title: Keep an interview log as evidence of discovery
summary: The log shows that the requirements came from discovery and not from assumption.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The requirements were produced by a discussion.
conditions_does_not_apply_when: The requirements were given directly.
artifact_contract_output_type: discovery-log
artifact_contract_required_data:
  - the rounds of questions
  - the decisions they produced
artifact_contract_verified_by: the log records the questions asked and the decisions they produced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Keep an interview log as evidence of discovery
**Interview Log is evidence of rigor.** Don't skip it. It shows that requirements came from discovery, not assumption.
<!-- vpmodule:atom:end keep-an-interview-log-as-evidence-of-discovery -->
<!-- vpmodule:atom:begin make-every-acceptance-criterion-resolve-to-pass-or-fail -->
---
instruction_id: make-every-acceptance-criterion-resolve-to-pass-or-fail
title: Make every acceptance criterion resolve to pass or fail
summary: A criterion that cannot be judged is not a criterion; it is an adjective.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written.
conditions_does_not_apply_when: The criteria already resolve to pass or fail.
artifact_contract_output_type: acceptance-criterion
artifact_contract_required_data:
  - the criterion
  - the way it resolves
artifact_contract_verified_by: every criterion is a checkbox that resolves to pass or fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make every acceptance criterion resolve to pass or fail
Every acceptance criterion must be a checkbox that resolves to PASS or FAIL.
No "should feel good", "looks reasonable", or "generally works" — those are not checkboxes.
<!-- vpmodule:atom:end make-every-acceptance-criterion-resolve-to-pass-or-fail -->
<!-- vpmodule:atom:begin make-every-requirement-falsifiable -->
---
instruction_id: make-every-requirement-falsifiable
title: Make every requirement falsifiable
summary: A requirement that no test or check could settle is not a requirement yet.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirement is written for a phase.
conditions_does_not_apply_when: The requirement is already stated as a pass or fail check.
artifact_contract_output_type: requirement-statement
artifact_contract_required_data:
  - the requirement
  - the check that would settle it
artifact_contract_verified_by: a test or check can be written that proves the requirement was met or not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make every requirement falsifiable
Every requirement must be falsifiable — you can write a test or check that proves it was met or not. Vague requirements like "improve performance" are not allowed.
<!-- vpmodule:atom:end make-every-requirement-falsifiable -->
<!-- vpmodule:atom:begin mark-an-under-specified-dimension-as-an-assumption -->
---
instruction_id: mark-an-under-specified-dimension-as-an-assumption
title: Mark an under-specified dimension as an assumption
summary: "A dimension below its minimum is marked, so it is carried as an assumption and not as a locked requirement."
capability_tags:
  - clarify-requirements
pattern_tags:
  - dimension-sweep
conditions_applies_when: A quality dimension of the specification is scored.
conditions_does_not_apply_when: Every dimension is at or above its minimum.
artifact_contract_output_type: dimension-report
artifact_contract_required_data:
  - the dimension
  - the score
  - the mark
artifact_contract_verified_by: the dimension below its minimum is marked as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Mark an under-specified dimension as an assumption
**Ambiguity Report must reflect the actual interview.** If a dimension is below minimum, mark it ⚠ — the planner knows to treat it as an assumption rather than a locked requirement.
<!-- vpmodule:atom:end mark-an-under-specified-dimension-as-an-assumption -->
<!-- vpmodule:atom:begin state-the-goal-as-a-change-from-a-to-b -->
---
instruction_id: state-the-goal-as-a-change-from-a-to-b
title: State the goal as a change from A to B
summary: "The goal is one measurable sentence: what changes from what to what."
capability_tags:
  - clarify-requirements
pattern_tags:
  - working-backwards
conditions_applies_when: The goal of a piece of work is being written.
conditions_does_not_apply_when: The goal is already a measured sentence.
artifact_contract_output_type: goal-statement
artifact_contract_required_data:
  - the state today
  - the state after
artifact_contract_verified_by: the goal names both the current state and the target state
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# State the goal as a change from A to B
[One precise sentence — specific and measurable. NOT "improve X" — instead "X changes from A to B".]
<!-- vpmodule:atom:end state-the-goal-as-a-change-from-a-to-b -->
<!-- vpmodule:atom:begin update-the-locked-spec-before-reopening-the-discussion -->
---
instruction_id: update-the-locked-spec-before-reopening-the-discussion
title: Update the locked spec before reopening the discussion
summary: "The specification is a one-way door: change it first, then re-run the discussion."
capability_tags:
  - clarify-requirements
pattern_tags:
  - living-specification
conditions_applies_when: A locked requirement has to change.
conditions_does_not_apply_when: The requirement was not locked yet.
artifact_contract_output_type: specification-update
artifact_contract_required_data:
  - the requirement that changed
  - the specification that now carries it
artifact_contract_verified_by: the specification carries the changed requirement before the discussion runs again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Update the locked spec before reopening the discussion
**SPEC.md is a one-way door for requirements.** discuss-phase will treat these as locked. If requirements change after SPEC.md is written, the user should update SPEC.md first, then re-run discuss-phase.
<!-- vpmodule:atom:end update-the-locked-spec-before-reopening-the-discussion -->
<!-- vpmodule:atom:begin write-each-requirement-as-current-target-acceptance -->
---
instruction_id: write-each-requirement-as-current-target-acceptance
title: "Write each requirement as current, target, acceptance"
summary: "Every requirement carries the state today, the state it becomes, and the check that settles it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - completion-criteria
conditions_applies_when: A requirement is written.
conditions_does_not_apply_when: The requirement already carries all three fields.
artifact_contract_output_type: requirement-triple
artifact_contract_required_data:
  - the current state
  - the target state
  - the acceptance check
artifact_contract_verified_by: "each requirement carries current, target and acceptance"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a universal current, target, and acceptance template without identifying a supported work domain; assigning a domain would require missing context."
---

# Write each requirement as current, target, acceptance
**Every requirement needs all three fields:**
Current: grounds the requirement in reality — what exists today?
Target: the concrete change — not "improve X" but "X becomes Y"
Acceptance: the falsifiable check — how does a verifier confirm this?
<!-- vpmodule:atom:end write-each-requirement-as-current-target-acceptance -->