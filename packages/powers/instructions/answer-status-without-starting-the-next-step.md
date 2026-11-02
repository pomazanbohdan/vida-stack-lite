---
instruction_id: answer-status-without-starting-the-next-step
title: Answer status without starting the next step
summary: "A status answer lists the initiative folder and the ticket's state, names the next step, and starts nothing."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: The user asks for status, what is ready, or what comes next.
conditions_does_not_apply_when: The user asks to start or build a named ticket.
artifact_contract_output_type: status-answer
artifact_contract_required_data:
  - the initiative folder and its unfolded inputs
  - the ticket's state
  - the next step
artifact_contract_verified_by: "the answer reports state and names the next step without starting it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Answer status without starting the next step
A status or "what's next" answer lists the initiative folder — a `<type>-<slug>/` absent from `sources:` and `companions:` is an input not yet folded in, and is not opened — and reports the file's state: open questions and assumptions, not sliced, epics not refined, entries ready, blocked.
Name the next step without starting it.
Only an explicit start request starts work, and it is a separate yes from approving the plan or publishing to a tracker.
