---
instruction_id: automate-enforceable-rules
title: Automate enforceable rules
summary: "Move a rule that can be checked mechanically into the check, and keep instruction for the judgment calls that no mechanism can settle."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A rule can be checked without understanding the context.
conditions_does_not_apply_when: The rule needs judgment or an assessment of intent.
artifact_contract_output_type: automated-rule
artifact_contract_required_data:
  - rule
  - check
  - violation message
artifact_contract_verified_by: automated check fails on a real violation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-encode-lessons-in-structure/SKILL.md
status: active
revision: 2
---

# Automate enforceable rules
Encode a recurring correction as a structural guardrail instead of more text.
Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Design the repository so a change that looks right from one file is right for the whole repository.
Find the mistake classes first. Read recent commits, reverts, review comments, agent instruction files, and comments that explain workarounds. Group the mistakes into classes. A class counts once it has happened twice.
Fix each class at the highest level that works.
Eliminate it with architecture: give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy.
Enforce it with types so the bad state cannot be written. If bad code still compiles, add a lint or continuous check whose error names the file, type, or function to use instead.
If the pattern is already common, fail only when a change adds more.
Test the behavior. Fix or delete any test that still passes when the behavior it checks breaks, or that fails when only the internals change.
Write documentation or agent rules last, only for judgment calls. Nothing fails when an agent skips them.
A rule that can be checked without understanding context belongs in the check. A rule that needs judgment stays an instruction.
Prove each new check fails on a real past mistake. Run the same command locally and in continuous integration.
Exceptions go on the offending line with a reason, an expiry date, and a human's approval.
Keep a table that pairs each rule with what enforces it. When the operator corrects you, fix the mistake and add the rule.
If the rule was already there and nothing enforces it, that is a repeat, so fix it at the highest level in the same change.
Drop a rule once its mistake cannot happen.
Reply with each class, its evidence, the level you picked, and why a higher level did not work.
