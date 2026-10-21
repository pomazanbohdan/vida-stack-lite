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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/retro/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 6
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
