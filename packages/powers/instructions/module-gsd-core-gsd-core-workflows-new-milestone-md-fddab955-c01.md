---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-new-milestone-md-fddab955-c01"
title: "gsd-core: gsd-core/workflows/new-milestone.md module"
summary: "Carrier for 6 atomic instructions from gsd-core:gsd-core/workflows/new-milestone.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/new-milestone.md\"}"
atom_ids:
  - capture-the-outgoing-value-before-the-state-flips
  - do-not-change-a-persistent-default-from-a-one-off-choice
  - link-only-on-a-clear-confident-match
  - route-every-unselected-item-to-later-or-out-of-scope
  - verify-the-artifact-you-will-build-on-is-complete
  - write-the-files-before-you-report
atom_count: 6
atoms: "[{\"atom_id\":\"capture-the-outgoing-value-before-the-state-flips\",\"file_sha256\":\"b8251db731ac81e94493041628798bc1efbe98ef09532a0865436797f6b32bd3\",\"content_sha256\":\"d017563dec5d4a5df8168a27dd9bc33e707355b237c3f3c5bb2274c7a661995a\",\"file_bytes\":1369,\"body_bytes\":247},{\"atom_id\":\"do-not-change-a-persistent-default-from-a-one-off-choice\",\"file_sha256\":\"c70511e0301419a027b22691a72ce797c8eb3261fe79cbc41171097c0a92727e\",\"content_sha256\":\"f504cedc59d416fbf03d422d34d23ac7cbbd465cd21abe8c8dea7aaaddf8bfc7\",\"file_bytes\":1420,\"body_bytes\":197},{\"atom_id\":\"link-only-on-a-clear-confident-match\",\"file_sha256\":\"3bcaa4d8a2c6d0188eeeb14ea1f5b646829ff45ccbce00d611366ec117a2340e\",\"content_sha256\":\"be4822ca4468a72b99f0ed3e11dcfe9cdbf643ae8196f5eab4ebf1ece65dbcea\",\"file_bytes\":1401,\"body_bytes\":251},{\"atom_id\":\"route-every-unselected-item-to-later-or-out-of-scope\",\"file_sha256\":\"0ecfe47ceb2707e7cb391749ff63951e31893af500c8fdd614f02ea546b2320f\",\"content_sha256\":\"d836146f6d4ec7343f4f06c06f8b128cdc4efb88cc5eafb0e42a886ef80c46c6\",\"file_bytes\":1566,\"body_bytes\":283},{\"atom_id\":\"verify-the-artifact-you-will-build-on-is-complete\",\"file_sha256\":\"9c0b163c00ece2cfa1193164e9db54197bbc564cf5b7fcdf726db04a12838efb\",\"content_sha256\":\"e9964077c7b6169321adb36f3fe77ce79722ae837f8771495f6b4f0e9fb18f37\",\"file_bytes\":1757,\"body_bytes\":445},{\"atom_id\":\"write-the-files-before-you-report\",\"file_sha256\":\"e9491d6487126fbe7d152f194bccb680c17234752cba3208fc537f20410fa0e2\",\"content_sha256\":\"d90a97a65109ff86398b93238235c470b4dabc1a9028ed78615c03a7791c1ce3\",\"file_bytes\":1357,\"body_bytes\":232}]"
carrier_sha256: 3eb52d31985b286fb5fe509f09c1aaaa9e1c2981a943bd8da8ee27190d110a5f
carrier_bytes: 9767
revision: 1
status: active
---
<!-- vpmodule:atom:begin capture-the-outgoing-value-before-the-state-flips -->
---
instruction_id: capture-the-outgoing-value-before-the-state-flips
title: Capture the outgoing value before the state flips
summary: "The value that is about to be replaced is read and stored before the switch, and the stored value is read back rather than retyped by hand."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A state switch is about to replace a value that a later step still needs.
conditions_does_not_apply_when: The outgoing value is not needed after the switch.
artifact_contract_output_type: captured-outgoing-value
artifact_contract_required_data:
  - the captured value
  - the step that consumes it
artifact_contract_verified_by: the value was captured before the switch and read back rather than retyped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Capture the outgoing value before the state flips
Capture the outgoing version now.
current-milestone state no longer holds the outgoing version, which is why it is captured here.
do NOT transcribe the echoed value into a later command by hand.
<!-- vpmodule:atom:end capture-the-outgoing-value-before-the-state-flips -->
<!-- vpmodule:atom:begin do-not-change-a-persistent-default-from-a-one-off-choice -->
---
instruction_id: do-not-change-a-persistent-default-from-a-one-off-choice
title: Do not change a persistent default from a one-off choice
summary: A choice made for this run is not written into the setting that governs later runs; changing that setting silently changes every future run.
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A one-off decision would be persisted into a standing setting.
conditions_does_not_apply_when: The decision is meant to change the standing setting.
artifact_contract_output_type: default-change-report
artifact_contract_required_data:
  - the choice that was made
  - the setting that stays untouched
artifact_contract_verified_by: the standing setting is unchanged after a one-off choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body separates a one-off choice from a persistent setting across runs, but does not state what the setting controls."
---

# Do not change a persistent default from a one-off choice
Do not persist this choice.
Changing it here would silently alter future
A preference governs later runs.
Change the default in settings.
<!-- vpmodule:atom:end do-not-change-a-persistent-default-from-a-one-off-choice -->
<!-- vpmodule:atom:begin link-only-on-a-clear-confident-match -->
---
instruction_id: link-only-on-a-clear-confident-match
title: "Link only on a clear, confident match"
summary: A pending item is linked to a planned unit only when the match is clear and confident; a vague or cross-cutting item is left untouched.
capability_tags:
  - triage-reports
pattern_tags:
  - scope-routing
conditions_applies_when: Pending items are matched against the planned units.
conditions_does_not_apply_when: No item is matched against anything.
artifact_contract_output_type: match-record
artifact_contract_required_data:
  - the linked pairs
  - the items left unmatched
artifact_contract_verified_by: "no item was linked without a clear, confident match"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs matching pending todos to planned units but names no substantive domain; choosing one would require context beyond the body and literal conditions.
---

# Link only on a clear, confident match
Only modify todos that have a clear, confident match.
Narrow, specific todos with concrete scopes are the best candidates.
Vague or cross-cutting todos should be left unlinked.
Leave unmatched todos unmodified.
<!-- vpmodule:atom:end link-only-on-a-clear-confident-match -->
<!-- vpmodule:atom:begin route-every-unselected-item-to-later-or-out-of-scope -->
---
instruction_id: route-every-unselected-item-to-later-or-out-of-scope
title: Route every unselected item to later or out of scope
summary: "Nothing that was offered is dropped: the selected items belong to this milestone, the unselected table stakes belong to the next one, and the unselected differentiators become explicit exclusions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: A category of items is scoped for the current milestone.
conditions_does_not_apply_when: Every item in the category is selected.
artifact_contract_output_type: scope-routing-record
artifact_contract_required_data:
  - the selected items
  - the items routed to the next milestone
  - the items excluded
artifact_contract_verified_by: no offered item is dropped without a destination
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Route every unselected item to later or out of scope
Selected features → v1 requirements
Unselected table stakes → v2 (users expect these)
Unselected differentiators → out of scope
Selected → this milestone.
Unselected table stakes → future.
Nothing is dropped silently.
<!-- vpmodule:atom:end route-every-unselected-item-to-later-or-out-of-scope -->
<!-- vpmodule:atom:begin verify-the-artifact-you-will-build-on-is-complete -->
---
instruction_id: verify-the-artifact-you-will-build-on-is-complete
title: Verify the artifact you will build on is complete
summary: "The artefact the next stage depends on is checked for existence and substance before that stage runs; an inline return is persisted, and an unrecoverable one stops the run."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - completion-criteria
conditions_applies_when: A stage hands an artefact to the next stage.
conditions_does_not_apply_when: The artefact was already verified in this run.
artifact_contract_output_type: artifact-verification
artifact_contract_required_data:
  - the existence and substance check
  - the persisted document
  - the error that stops the run
artifact_contract_verified_by: the next stage never runs against a missing or truncated artefact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Verify the artifact you will build on is complete
exists AND is substantive - non-empty, and free of any leftover
continuation sentinel (which marks a truncated/incomplete write).
never runs against a missing or truncated
Prompt hardening alone does not fully eliminate it, so the orchestrator MUST absorb either cause deterministically
A brief return is not the file.
If it is missing, surface the error.
Never build on a truncated artifact.
<!-- vpmodule:atom:end verify-the-artifact-you-will-build-on-is-complete -->
<!-- vpmodule:atom:begin write-the-files-before-you-report -->
---
instruction_id: write-the-files-before-you-report
title: Write the files before you report
summary: "The artefacts are written and committed before the result is reported, so a lost context never loses the work."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verification-before-completion
conditions_applies_when: A step produces artefacts and then reports back.
conditions_does_not_apply_when: The step produces no artefact.
artifact_contract_output_type: written-artifacts
artifact_contract_required_data:
  - the files written
  - the commit that holds them
artifact_contract_verified_by: the files were on disk and committed before the report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the files before you report
Write files first, then return.
This ensures artifacts persist even if context is lost.
Atomic commits: Each phase commits its artifacts immediately.
Roadmap files written immediately (not draft)
<!-- vpmodule:atom:end write-the-files-before-you-report -->