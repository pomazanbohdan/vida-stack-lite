---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-new-project-md-fdef44cf-c01"
title: "gsd-core: gsd-core/workflows/new-project.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/new-project.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/new-project.md\"}"
atom_ids:
  - call-the-unvalidated-requirements-hypotheses
  - cross-check-the-requirements-against-the-core-value
  - show-every-requirement-not-counts
  - show-the-saved-defaults-before-you-ask
  - take-over-in-flight-work
atom_count: 5
atoms: "[{\"atom_id\":\"call-the-unvalidated-requirements-hypotheses\",\"file_sha256\":\"64d4302d9bac90dc6287fb4ea04987e1293e4dfac15ec90e1e8e28e47e3308b1\",\"content_sha256\":\"d913a2973948d238a38f8c56ccc05be5c1c11d1396f36c218dc369a965158233\",\"file_bytes\":1368,\"body_bytes\":271},{\"atom_id\":\"cross-check-the-requirements-against-the-core-value\",\"file_sha256\":\"298e6ef9bce8c02f4476bacaf22c98bcdc6de4caf41a47a4571f411c2eda50a7\",\"content_sha256\":\"9720032e95bc2abe38c385277251bff97d0b39dc0bab9edd600cc76d8e50857a\",\"file_bytes\":1326,\"body_bytes\":233},{\"atom_id\":\"show-every-requirement-not-counts\",\"file_sha256\":\"6c8a0236e4640097f6baad67caabe395392b68566071e8dc872193bd233f66c8\",\"content_sha256\":\"0219cbbe0d38246352d4cbf9b499e5caea2765b7427806ff8a9b2cf12e384cf4\",\"file_bytes\":1231,\"body_bytes\":207},{\"atom_id\":\"show-the-saved-defaults-before-you-ask\",\"file_sha256\":\"8c141bdaad931e085d395f2cd159fb4540d36c633bdca498a31064feae0f549c\",\"content_sha256\":\"29e57048f3c613c3fe1c33daa38bbe5f3c37cc105f96d2ce920a9cdb2949898b\",\"file_bytes\":1427,\"body_bytes\":349},{\"atom_id\":\"take-over-in-flight-work\",\"file_sha256\":\"d9ac50fa658867ea8e299a2093a50378c9d4e1daf436776c3202d027c62df57e\",\"content_sha256\":\"51d5d921af7cd4bd5abc391f16bb601775d8dfdad53c0bd0073dee8544361f20\",\"file_bytes\":2808,\"body_bytes\":1532}]"
carrier_sha256: be41fc0df19dfa9a1906adbb40a0c62109de208e6e6d15b3a95cb2a56ede8227
carrier_bytes: 8829
revision: 1
status: active
---
<!-- vpmodule:atom:begin call-the-unvalidated-requirements-hypotheses -->
---
instruction_id: call-the-unvalidated-requirements-hypotheses
title: Call the unvalidated requirements hypotheses
summary: A requirement that has not shipped and been validated is a hypothesis; the validated set is what the existing code already does.
capability_tags:
  - clarify-requirements
pattern_tags:
  - living-specification
conditions_applies_when: Requirements are recorded for a body of work that is not shipped yet.
conditions_does_not_apply_when: The requirements were already validated in an earlier run.
artifact_contract_output_type: requirement-status
artifact_contract_required_data:
  - the validated set
  - the hypotheses
  - the source of each validated item
artifact_contract_verified_by: no unshipped requirement is presented as validated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Call the unvalidated requirements hypotheses
All Active requirements are hypotheses until shipped and validated.
Infer Validated requirements from existing code:
Identify what the codebase already does
These become the initial Validated set
Not shipped: not validated.
<!-- vpmodule:atom:end call-the-unvalidated-requirements-hypotheses -->
<!-- vpmodule:atom:begin cross-check-the-requirements-against-the-core-value -->
---
instruction_id: cross-check-the-requirements-against-the-core-value
title: Cross-check the requirements against the core value
summary: "The gathered requirements are checked against the one thing that has to work, and any gap between them is surfaced instead of being left in the document."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A set of requirements has just been written down and the core value is known.
conditions_does_not_apply_when: There is no core value to check against.
artifact_contract_output_type: core-value-gap-report
artifact_contract_required_data:
  - the core value
  - the gaps found
artifact_contract_verified_by: every gap between the requirements and the core value was surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Cross-check the requirements against the core value
Cross-check requirements against Core Value from
If gaps detected, surface them.
Core value (the ONE thing that must work)
Stated constraints (budget, timeline, tech limitations)
<!-- vpmodule:atom:end cross-check-the-requirements-against-the-core-value -->
<!-- vpmodule:atom:begin show-every-requirement-not-counts -->
---
instruction_id: show-every-requirement-not-counts
title: "Show every requirement, not counts"
summary: "The confirmation shows the whole list of requirements, each one in full, so the caller can judge them item by item."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A list of requirements is put up for confirmation.
conditions_does_not_apply_when: Only a number is needed.
artifact_contract_output_type: full-requirement-list
artifact_contract_required_data:
  - every requirement in full
  - the confirmation question
artifact_contract_verified_by: every requirement is shown in full and not summarised as a count
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Show every requirement, not counts
Show every requirement (not counts) for user confirmation:
Present full requirements list (interactive mode only):
Does this capture what you're building? (yes / adjust)
<!-- vpmodule:atom:end show-every-requirement-not-counts -->
<!-- vpmodule:atom:begin show-the-saved-defaults-before-you-ask -->
---
instruction_id: show-the-saved-defaults-before-you-ask
title: Show the saved defaults before you ask
summary: "The stored defaults are shown before the questions are asked, so the caller can take them as they are, change a few, or start over."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A run is about to ask configuration questions and stored defaults exist.
conditions_does_not_apply_when: There are no stored defaults.
artifact_contract_output_type: defaults-then-questions
artifact_contract_required_data:
  - the stored defaults as they are
  - the ways to proceed with them
artifact_contract_verified_by: the defaults were displayed before the questions were asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the saved defaults before you ask
If the file exists, read and display its contents before asking:
For each selected setting across both blocks, ask only that question using the
Merge user answers over the saved defaults — unchanged settings retain their saved values.
Which settings do you want to change? (enter numbers, comma-separated)
<!-- vpmodule:atom:end show-the-saved-defaults-before-you-ask -->
<!-- vpmodule:atom:begin take-over-in-flight-work -->
---
instruction_id: take-over-in-flight-work
title: Take over in-flight work
summary: "Read the prior trail as authoritative, reconstruct the actual state, and resume from the smallest next action without redoing completed work."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: You start from unfinished work left by another executor or a previous run.
conditions_does_not_apply_when: The work starts from a clean state.
artifact_contract_output_type: takeover-record
artifact_contract_required_data:
  - actual state
  - decisions made
  - stopping point
  - next step
artifact_contract_verified_by: existing checks run before any edit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/ketchup/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/session-pickup.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Take over in-flight work
You own the resume point: read the prior trail, do not redo it.
Locate the prior trail in the active workspace's transcript directory, a cloud-agent URL, or a pushed branch.
Read the metadata overview and last messages first, then scan back for the decision points.
Parse a long transcript outside the main thread and keep the reduced timeline.
Reconstruct operational state: the branch and worktree, what already landed, the open todos, and the decisions made.
The prior trail is authoritative input; resist the bias to re-derive it.
Diff done against pending: compare what shipped against what was planned and name the resume point.
Do not re-run the prior reproduction or redo completed work.
A "let me verify from scratch" pass means you are treating the trail as untrustworthy when it is authoritative.
Route the remaining work to the matching workflow and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run.
Verify the inherited claims against the original goal on the real artifact.
A passing prior self-report is not the proof.
Run the existing checks before any edit.
Report where the prior agent stopped, what you inherited versus redid, the resume point, and the outcome.

If the initialisation was interrupted, keep the artefacts that already landed, skip the steps that would recreate them, and continue from the first missing artefact in order. Do not error and do not send the user back to the start.
<!-- vpmodule:atom:end take-over-in-flight-work -->