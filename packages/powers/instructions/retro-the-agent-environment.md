---
instruction_id: retro-the-agent-environment
title: Retro the agent environment
summary: "After a session, suggest improvements to the coding agent's environment, most severe first, by category: navigation, automated checks, coding standards, steering files, tool economy, no-ops and information access."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A coding session has finished and its environment can be improved for the next one.
conditions_does_not_apply_when: The session went well and nothing in the environment caused friction.
artifact_contract_output_type: retro-candidates
artifact_contract_required_data:
  - candidates by category
  - severity order
artifact_contract_verified_by: every candidate names the friction it removes and is ordered by severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/retro/SKILL.md
status: active
revision: 1
---

# Retro the agent environment
The user has asked for a **retrospective**. You are suggesting improvements to the coding agent's **environment** to improve future runs.
Read the primary sources for the session the user specifies. This may mean searching through session logs on this machine. If the user doesn't specify a session, default to the current one.
Look for candidates for improvement in these categories.
- **Navigation**: how easy was it for the agent to find the right files? Are there hidden dependencies between files? Would a **navigation pointer** make it easier? _Use when_ the session took a long time to find a piece of information.
- **Automated checks**: are there automated checks that could catch errors the agent made? Linting, typing, tests, filesystem linters? Read the repo's own check command first (its build-tool scripts, its CI workflow), so a check that already exists but sits unwired or silently broken is the finding, not a reinvention. A repo with no **guardrail** (no pre-commit hook and no CI job running its lint/typecheck/test command) is itself a finding: an un-linted repo is a standing missed opportunity, not a neutral default. _Use when_ the agent made a mistake an automated check could have caught, or the repo has no guardrail at all.
- **Coding standards**: should the **reviewer agent** be given a new rule to enforce? Should an existing rule be removed or clarified? _Use when_ the reviewer agent failed to catch a mistake.
- **Global steering file**: are there any steering instructions that should be moved to coding standards (or automated checks) instead? _Use when_ the steering file is particularly large - in the repo OR the user's global scope.
- **Tool economy**: did the agent make expensive tool calls that could be streamlined? Is there any custom tooling (CLI's, MCP's) that is particularly token-inefficient? _Use when_ the agent made an expensive tool call.
- **No-ops**: look for instructions in steering files that don't modify the agent's behavior. _Use when_ the steering files are large and unwieldy.
- **Information access**: look for opportunities to increase the agent's access to information. Teeing dev server logs, readonly access to third-party services. _Use when_ a crucial piece of information was not available to the agent.
Present these candidates to the user, in order of severity.
## Implementation vs Review
Remember that all work goes through two stages: implementation and review. The implementation agent has the most **context pressure**. They are responsible for exploration, writing code, and debugging failures.
The review agent has the least context pressure - it receives a diff, so no exploration needed. It often does not need to write code or debug.
This means that the review agent should be responsible for imposing coding standards, not the implementation agent.
