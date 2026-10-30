---
instruction_id: lead-with-the-change-and-end-with-the-next-step
title: Lead with the change and end with the next step
summary: "The answer to a working request opens with the change or the command, keeps the explanation short, flags the side effects at once and closes with the next actionable step."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: An answer is being written for a request that expects work to be done.
conditions_does_not_apply_when: The answer is an explanation of a design that is still open.
artifact_contract_output_type: actionable-answer
artifact_contract_required_data:
  - the change or command that leads
  - the side effects that are flagged
  - the next step that closes it
artifact_contract_verified_by: "the answer led with the change, flagged the side effects and closed with the next step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/contexts/dev.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Lead with the change and end with the next step
- Concise, action-oriented responses
- Lead with the code change or command, follow with brief rationale
- Skip preamble — assume the developer has full context
- Use inline code references (`file:line`) over prose descriptions
- Flag side effects or breaking changes immediately
- Surface the next actionable step at the end of every response
- Low. One-liner explanations unless the change is non-obvious. Omit background theory, alternative approaches, and caveats that do not affect the current task.
