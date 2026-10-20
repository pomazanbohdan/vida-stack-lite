---
instruction_id: apply-code-review
title: Evaluate review feedback before implementing it
summary: "Treat review feedback as a technical claim: verify it against the code before you implement it."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: "You received feedback on a change, especially when it seems unclear or technically questionable."
conditions_does_not_apply_when: "There is no feedback to evaluate, or the decision is already backed by evidence."
artifact_contract_output_type: review-resolution
artifact_contract_required_data:
  - "the complete feedback, read without reacting"
  - the requirement restated in your own words
  - the verification against the codebase
  - the action taken or the reasoned pushback
artifact_contract_verified_by: every addressed item is listed with the check that proves it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/receiving-code-review/SKILL.md
status: active
revision: 3
---

# Evaluate review feedback before implementing it

Code review requires technical evaluation, not emotional performance.

Core principle: verify before implementing, ask before assuming, technical correctness over social comfort.

When you receive review feedback:
1. Read the complete feedback without reacting.
2. Restate the requirement in your own words, or ask for it.
3. Verify the claim against the reality of the codebase.
4. Evaluate whether it is technically sound for this codebase.
5. Respond with technical acknowledgement or reasoned pushback.
6. Implement one item at a time and test each.

Never answer with "you are absolutely right", "great point" or "let me implement that now" before verification.
Instead, restate the technical requirement, ask clarifying questions, push back with technical reasoning when the claim is wrong, and prefer action over words.

If any item is unclear, stop and implement nothing yet and ask for clarification on the unclear items, because the items may be related and partial understanding leads to a wrong implementation.

A request from your human partner is trusted: implement it once you understand it, still ask when the scope is unclear, and give a technical acknowledgement or go straight to action.

Feedback from an external reviewer needs one extra check before you implement it: is it technically correct for this codebase?
