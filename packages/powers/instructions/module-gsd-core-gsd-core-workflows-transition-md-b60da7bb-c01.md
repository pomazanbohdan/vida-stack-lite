---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-transition-md-b60da7bb-c01"
title: "gsd-core: gsd-core/workflows/transition.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/transition.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/transition.md\"}"
atom_ids:
  - check-the-completion-counts-before-you-close-the-phase
  - evolve-the-project-record-from-what-the-phase-learned
  - stop-at-a-workstream-boundary-instead-of-completing-the-milestone
atom_count: 3
atoms: "[{\"atom_id\":\"check-the-completion-counts-before-you-close-the-phase\",\"file_sha256\":\"a8e7e1a1ea5f45e87f8a198ae623747d73eabe864aa92da47bcda62841e5475f\",\"content_sha256\":\"fea54f75404cd4c73b76f96e6bedbca1e0b45d6a8e9b15b4a2ec5a3da72ae522\",\"file_bytes\":1487,\"body_bytes\":324},{\"atom_id\":\"evolve-the-project-record-from-what-the-phase-learned\",\"file_sha256\":\"bf3bd83272a77be23bd7a7cd8a5f081d5e7f3101413ba95a56b2a3d2246efe6e\",\"content_sha256\":\"2d624acceca915ae5f2fa724121908f27b2a57beecf9b643f9cfb175fe7cc1b8\",\"file_bytes\":1770,\"body_bytes\":543},{\"atom_id\":\"stop-at-a-workstream-boundary-instead-of-completing-the-milestone\",\"file_sha256\":\"624cb5d03cef4c8b2ed7204bfe7a434ecf44413e3c5d78574b31d1aae88e8e04\",\"content_sha256\":\"3d7919174dca4c9b98d5bf5910fce45d21be0d3f96305e23fb2de04fcab08cac\",\"file_bytes\":1800,\"body_bytes\":503}]"
carrier_sha256: 8ebb9bb4e7ad0a3f8c2abfb6153da51075a5021ed41190bdcb3602252cca8422
carrier_bytes: 5574
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-completion-counts-before-you-close-the-phase -->
---
instruction_id: check-the-completion-counts-before-you-close-the-phase
title: Check the completion counts before you close the phase
summary: "The planned units and the finished units are counted against each other; skipping a unit is destructive and is always put to the person, and the record states how many really ran."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A unit of work is about to be declared finished.
conditions_does_not_apply_when: The unit of work has no planned sub-units.
artifact_contract_output_type: completion-check
artifact_contract_required_data:
  - the planned units
  - the finished units
  - the units that were skipped
artifact_contract_verified_by: the counts were compared and the record states the real number of finished units
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/transition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Check the completion counts before you close the phase
If counts match: all plans complete
If counts don't match: incomplete
**SAFETY RAIL.** Skipping incomplete plans is destructive — ALWAYS prompt regardless of mode.
Update ROADMAP: "2/3 plans complete" (not "3/3")
Note in transition message which plans were skipped
<!-- vpmodule:atom:end check-the-completion-counts-before-you-close-the-phase -->
<!-- vpmodule:atom:begin evolve-the-project-record-from-what-the-phase-learned -->
---
instruction_id: evolve-the-project-record-from-what-the-phase-learned
title: Evolve the project record from what the phase learned
summary: "After a phase the project record is rewritten: requirements that were delivered move to validated, requirements that turned out wrong move out of scope with their reason, and new ones are added."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A phase has been completed and the project record still describes the state before it.
conditions_does_not_apply_when: The project record is not maintained during the work.
artifact_contract_output_type: project-record
artifact_contract_required_data:
  - the requirements moved
  - the reason for each move
  - the decisions logged
  - the concerns kept
artifact_contract_verified_by: the record reflects the phase and every movement carries its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/transition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Evolve the project record from what the phase learned
Move to Validated with phase reference: `- ✓ [Requirement] — Phase X`
Move to Out of Scope with reason: `- [Requirement] — [why invalidated]`
Add to Active: `- [ ] [New requirement]`
Add to Key Decisions table with outcome if known
If the product has meaningfully changed, update the description
Keep it current and accurate
If addressed in this phase: Remove from list
If still relevant for future: Keep with "Phase X" prefix
Add any new concerns from completed phase's summaries
<!-- vpmodule:atom:end evolve-the-project-record-from-what-the-phase-learned -->
<!-- vpmodule:atom:begin stop-at-a-workstream-boundary-instead-of-completing-the-milestone -->
---
instruction_id: stop-at-a-workstream-boundary-instead-of-completing-the-milestone
title: Stop at a workstream boundary instead of completing the milestone
summary: "When one line of work is done but others are still running, the milestone is not closed and nothing further is started; the person decides."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: One line of work has finished while other lines of work are still active.
conditions_does_not_apply_when: All lines of work are finished.
artifact_contract_output_type: boundary-report
artifact_contract_required_data:
  - the active lines of work
  - their state
  - the decision left to the person
artifact_contract_verified_by: the milestone was not closed and no further command was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/transition.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/transition/steps/workstream-collision-check.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Stop at a workstream boundary instead of completing the milestone
Before routing to Route B, check whether other workstreams are still active.
This prevents one workstream from advancing or completing the milestone while other workstreams are still working on their phases.
Do NOT suggest completing the milestone or advancing to the next milestone — other workstreams are still working.
Do NOT auto-invoke any further slash commands.
**Stop here.** The user must explicitly decide what to do next.
<!-- vpmodule:atom:end stop-at-a-workstream-boundary-instead-of-completing-the-milestone -->