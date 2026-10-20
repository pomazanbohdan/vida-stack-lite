---
instruction_id: match-guidance-form-to-failure
title: Match the form of guidance to the failure
summary: "Classify the baseline failure first: prohibition for rule violations, a positive recipe for wrong-shaped output, a required slot for omissions, and a conditional for behavior that depends on a condition."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You are choosing the form in which to state a rule.
conditions_does_not_apply_when: The failure type has not been established yet.
artifact_contract_output_type: guidance-form-choice
artifact_contract_required_data:
  - baseline failure type
  - chosen form
  - wording check
artifact_contract_verified_by: the chosen form matches the observed failure type
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 1
---

# Match the form of guidance to the failure
Before writing guidance, classify the baseline failure.
The form that bulletproofs one failure type measurably backfires on another.
If the agent skips or violates a rule under pressure, use a prohibition.
If the agent skips or violates a rule under pressure, add a rationalization table and red flags.
If the agent complies but the output has the wrong shape, state what the output is: its parts, in order.
If the agent omits a required element, make it a required field or slot in the template the agent fills in.
If behavior should depend on a condition, key it to an observable predicate.
Do not use soft guidance for a rule violation.
Do not use a prohibition list for a wrong-shaped output.
Do not use prose reminders near the template for an omitted required element.
Do not use an unconditional rule with exemption clauses for conditional behavior.
Do not write nuance clauses.
"Don't X unless it matters" reopens the negotiation.
Express a real exception as its own conditional on an observable predicate.
Exemption clauses don't scope.
"This limit doesn't apply to code blocks" still suppresses code blocks.
If part of the output must be exempt, restructure so the rule can't reach it.
Micro-test your own case rather than assuming.
Never reach for the prohibition by default.
