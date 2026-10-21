---
instruction_id: follow-the-established-stack-and-say-when-you-deviate
title: Follow the established stack and say when you deviate
summary: The stack and patterns the project already settled on are used by default; the heavy infrastructure that would slow the work down is left out.
capability_tags:
  - consult-guidance
pattern_tags:
  - project-conventions-first
conditions_applies_when: Work starts in a project that already has an established stack and conventions.
conditions_does_not_apply_when: The project has no stack and none is expected.
artifact_contract_output_type: stack-decision
artifact_contract_required_data:
  - the conventions that were followed
  - the stack that was used
  - the deviations
artifact_contract_verified_by: the established stack was used and every deviation was said out loud
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 1
---

# Follow the established stack and say when you deviate
**Check conventions first.**
follow its stack and patterns — these represent validated choices the user expects to see continued.
Use the project's language/framework by default.
Avoid unless the spike specifically requires it:
Complex package management beyond `npm install` or `pip install`
Build tools, bundlers, or transpilers
Docker, containers, or infrastructure
Env files or config systems — hardcode everything
