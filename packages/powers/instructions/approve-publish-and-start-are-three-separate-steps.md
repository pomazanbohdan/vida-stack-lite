---
instruction_id: approve-publish-and-start-are-three-separate-steps
title: "Approve, publish, and start as three separate steps"
summary: "Approving a set of work items records it; publishing it and starting the work are approved separately, and none of them moves the status or the assignee."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A set of work items has been agreed and something is about to be published or started.
conditions_does_not_apply_when: The user asked for publication and the start in one request.
artifact_contract_output_type: approval-record
artifact_contract_required_data:
  - what was approved
  - the separate approvals still owed
  - the identity and status that were preserved
artifact_contract_verified_by: publication and the start each carry their own approval
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/board.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone/steps/git-tag.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/cleanup.md
status: active
revision: 2
---

# Approve, publish, and start as three separate steps
Before publish, ask once which other validations to run unless already said, and still get a yes to publish unless they said to publish too.
A reply approves what was presented; publication and starting work are approved separately unless the user asks for them together.
None of these changes status or assignee: preserve identity and any existing `status`, `tracker_status`, and assignee.
Approving a breakdown records it in the epic's `tickets.toml`; it does not start work.
On a tracker the ticket stays in the tree until it is published, a separate approval, per `board.md`.
Creating the tag locally and pushing it to the remote are two separate steps: the push carries its own question.
A distinct action gets its own explicit question and must not be silently folded into another approval.
