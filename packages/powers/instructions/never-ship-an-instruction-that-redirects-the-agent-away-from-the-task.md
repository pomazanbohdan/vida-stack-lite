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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/develop-a-capability.md
status: active
revision: 1
---

# Never ship an instruction that redirects the agent away from the task
**Do not embed anything that tries to redirect the agent away from the user's task** — reframing its role, overriding host instructions, or persisting directives past the skill's own scope. That is indistinguishable from a prompt-injection payload, and the fact that it is not scanned is not permission.
