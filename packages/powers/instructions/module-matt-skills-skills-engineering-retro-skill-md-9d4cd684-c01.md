---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-retro-skill-md-9d4cd684-c01"
title: "matt-skills: skills/engineering/retro/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/retro/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/retro/SKILL.md\"}"
atom_ids:
  - automate-enforceable-rules
  - retro-the-agent-environment
atom_count: 2
atoms: "[{\"atom_id\":\"automate-enforceable-rules\",\"file_sha256\":\"2c8be737e46efaf392a6a6156d718da3114d7837d4f407e72c90c281e3748cee\",\"content_sha256\":\"d58f91b8ab284e567e9ac8d893d9f1811abe6a01b800256b13e9ad98c10e71b2\",\"file_bytes\":4709,\"body_bytes\":3416},{\"atom_id\":\"retro-the-agent-environment\",\"file_sha256\":\"5ddbd4873a2ab4fb0b41ee7f467333022d4fa0040bc8eb62686313601962b624\",\"content_sha256\":\"53db7c91df9486ab0f336f388bc0747c333a966032df1bbe29b6219b31906848\",\"file_bytes\":4041,\"body_bytes\":2865}]"
carrier_sha256: 50fd05bd86817c81e2c5b207162af730b87c308bfb5312b9d403acb3968af4ac
carrier_bytes: 8971
revision: 1
status: active
---
<!-- vpmodule:atom:begin automate-enforceable-rules -->
---
instruction_id: automate-enforceable-rules
title: Automate rules that can be checked mechanically
summary: "Turn mechanically checkable rules into validation that fails before completion, and keep prose for the judgment calls."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: The rule can be checked without understanding context.
conditions_does_not_apply_when: The rule requires judgment or an assessment of intent.
artifact_contract_output_type: automated-rule
artifact_contract_required_data:
  - rule
  - check
  - violation message
artifact_contract_verified_by: the automated check fails on a real violation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/writing-skills/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/retro/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 9
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Automate rules that can be checked mechanically

If a constraint is enforceable with a regex or a validation, automate it and keep the documentation for the judgment calls.

Match the form of the guidance to the baseline failure, because the form that bulletproofs one failure measurably backfires on another:

- The rule is skipped or violated under pressure, even though it is known: use a prohibition with a rationalization table and red flags, never soft guidance such as "prefer" or "consider".
- The output is produced but has the wrong shape, for example a bloated prompt, a buried verdict or a restated spec: use a positive recipe or a contract that states what the output IS and in which order.
- A required element is omitted from something that is already produced: make it structural, a required field or a slot in the template that gets filled in, not a prose reminder next to the template.
- The behaviour should depend on a condition: key it to an observable predicate, for example "if the brief exists, reference it", instead of an unconditional rule with exemption clauses.

Close every loophole explicitly: do not only state the rule, forbid the specific workarounds, and add the foundational principle early, because an agent that knows the rule will find a loophole when it is under pressure.

Test the guidance before you deploy it, with no exceptions. The usual excuses — that it is obviously clear, that it is just a reference, that testing is overkill, that problems will show up later, that it is too tedious, that you are confident, that an academic review is enough, that there is no time — all mean the same thing: untested guidance has issues, and testing before deploying saves far more time than fixing it afterwards.

Match the test to the kind of guidance: for a discipline-enforcing skill, ask academic questions about the rules, apply pressure scenarios, combine several pressures such as time, sunk cost and exhaustion, and identify the rationalizations to answer with explicit counters; the success criterion is that the rule is followed under maximum pressure. For a technique skill, test application scenarios, variation scenarios and missing information; the criterion is that the technique is applied to a new scenario. For a pattern skill, test recognition, application and counter-examples; the criterion is that the pattern is applied at the right moment and not applied when it does not fit. For a reference skill, test retrieval, application and gap coverage; the criterion is that the right information is found and applied.

When an agent finds a new rationalization, add an explicit counter and re-test until the guidance holds.
Classify the violation first: a **mechanical** one (a fixed syntactic pattern, a banned API, an import shape, a file-location rule) gets a deterministic check, full stop: a custom rule in the repo's own linter, a new pre-commit hook, or a new CI job, whichever the repo's language and existing guardrail make cheapest. Default to building the check over writing the rule. Reserve the coding standards file for genuine **judgement calls** (cross-file consistency, "matches the surrounding style," anything no guardrail could ever substitute for).

**Style rules an agent should self-enforce**: That job belongs to a formatter, linter, hook, or CI check. The skill proposes the check instead, and a check that lands deletes its line.
<!-- vpmodule:atom:end automate-enforceable-rules -->
<!-- vpmodule:atom:begin retro-the-agent-environment -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/retro/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
  - research
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
<!-- vpmodule:atom:end retro-the-agent-environment -->