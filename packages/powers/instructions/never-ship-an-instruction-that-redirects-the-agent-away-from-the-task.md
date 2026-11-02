---
instruction_id: never-ship-an-instruction-that-redirects-the-agent-away-from-the-task
title: Never ship an instruction that redirects the agent away from the task
summary: "A skill body that reframes the agent's role, overrides the host's instructions or persists past its own scope is a redirect; it is not shipped."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A skill body is being written for another agent to follow.
conditions_does_not_apply_when: The body describes a task the agent is meant to do.
artifact_contract_output_type: skill-body
artifact_contract_required_data:
  - the skill body
artifact_contract_verified_by: "no line of the body redirects the agent away from the user's task or past the skill's own scope"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/develop-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never ship an instruction that redirects the agent away from the task
**Do not embed anything that tries to redirect the agent away from the user's task** — reframing its role, overriding host instructions, or persisting directives past the skill's own scope. That is indistinguishable from a prompt-injection payload, and the fact that it is not scanned is not permission.
