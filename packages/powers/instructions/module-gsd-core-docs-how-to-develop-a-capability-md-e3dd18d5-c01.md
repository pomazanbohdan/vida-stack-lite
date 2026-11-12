---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-develop-a-capability-md-e3dd18d5-c01"
title: "gsd-core: docs/how-to/develop-a-capability.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/develop-a-capability.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/develop-a-capability.md\"}"
atom_ids:
  - never-ship-an-instruction-that-redirects-the-agent-away-from-the-task
  - treat-the-skill-body-as-an-instruction-surface
atom_count: 2
atoms: "[{\"atom_id\":\"never-ship-an-instruction-that-redirects-the-agent-away-from-the-task\",\"file_sha256\":\"c911ba97c46da4ef2c52a3bfe9c7e7f58509736089e2da2b32380bb56018d75b\",\"content_sha256\":\"af3a8cc082ec1c2beec66c6b35553bc2d15c974169c61bfeb807fcd873d4caff\",\"file_bytes\":1524,\"body_bytes\":378},{\"atom_id\":\"treat-the-skill-body-as-an-instruction-surface\",\"file_sha256\":\"b41ccb0cf4c43b35763fcef9210dd0b04c43c9387fbedc47432f1df6e2633fe8\",\"content_sha256\":\"f3ee63091822315f231ee4f8ca3e08601dba9e24309184a48e580313aa65256e\",\"file_bytes\":1637,\"body_bytes\":524}]"
carrier_sha256: d8ed72697a99e90ec4e09e6e406e6d14d073e47ae91ae26e101cdbc2a7593271
carrier_bytes: 3506
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-ship-an-instruction-that-redirects-the-agent-away-from-the-task -->
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
<!-- vpmodule:atom:end never-ship-an-instruction-that-redirects-the-agent-away-from-the-task -->
<!-- vpmodule:atom:begin treat-the-skill-body-as-an-instruction-surface -->
---
instruction_id: treat-the-skill-body-as-an-instruction-surface
title: Treat the skill body as an instruction surface
summary: "A skill body is copied verbatim into the agent's instruction context and is never scanned; what it says is what the agent will do."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A body of text is shipped as a skill that agents will read.
conditions_does_not_apply_when: The text is an inert document no agent reads.
artifact_contract_output_type: skill-body
artifact_contract_required_data:
  - the skill body
  - the instruction it will become
artifact_contract_verified_by: "the body was written as an instruction someone would defend, knowing nothing scans it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/develop-a-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Treat the skill body as an instruction surface
A skill your Capability declares is not an inert asset. Its `SKILL.md` body is copied **verbatim** into the user's runtime skills directory at install, where it becomes an agent-invocable instruction file. GSD does **not** scan it: there is no content inspection of any kind, at install or at any later point. What you write is what reaches the agent.
**Write instructions you would be comfortable defending.** Your reach is bounded only by what the agent will do when told.
<!-- vpmodule:atom:end treat-the-skill-body-as-an-instruction-surface -->