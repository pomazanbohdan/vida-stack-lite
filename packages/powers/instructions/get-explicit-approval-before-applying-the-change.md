---
instruction_id: get-explicit-approval-before-applying-the-change
title: Get explicit approval before applying the change
summary: "Put the finished proposal to the owner for a clear yes, and send a revision back to the step that owns the problem."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A change proposal is complete and the owner has to approve it before anything is applied.
conditions_does_not_apply_when: The run is unattended and the approval is recorded elsewhere.
artifact_contract_output_type: approval-record
artifact_contract_required_data:
  - the proposal put to the owner
  - the answer
  - the conditions
  - the step the revision returns to
artifact_contract_verified_by: the approval is on record and a revision was routed back to the owning step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/inbox.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Get explicit approval before applying the change
Get explicit user approval for complete proposal
Do you approve this Sprint Change Proposal for implementation? (yes/no/revise)
If the user chooses **Edit**, revise the proposal with them and write the updated document before continuing.
If no or revise
Gather specific feedback on what needs adjustment
Return to appropriate step to address concerns
Present complete proposal to user
Get clear yes/no approval for proceeding
Document approval and any conditions

Approval for one step is not approval for the next: approval to classify the material is not approval to write the deliverable. Show the exact destinations and require an explicit choice.
The absence of findings is not authorization to write.
Without an explicit opt-in, report only - take no action on what you reviewed.
Confirm with the user before closing anything.
