---
schema: VPInstructionModule/v1
instruction_id: "module-superpowers-skills-receiving-code-review-skill-md-c6636869-c01"
title: "superpowers: skills/receiving-code-review/SKILL.md module"
summary: "Carrier for 2 atomic instructions from superpowers:skills/receiving-code-review/SKILL.md."
source: "{\"donor\":\"superpowers\",\"path\":\"skills/receiving-code-review/SKILL.md\"}"
atom_ids:
  - apply-code-review
  - avoid-performative-review-agreement
atom_count: 2
atoms: "[{\"atom_id\":\"apply-code-review\",\"file_sha256\":\"aece581e942aef483f0138473b563f2b910e55c9a09c5302f3610d9676490c68\",\"content_sha256\":\"68236df04028de623b934eb0169cf85e776185f230fdce9814dda5aa22d31afb\",\"file_bytes\":3789,\"body_bytes\":2571},{\"atom_id\":\"avoid-performative-review-agreement\",\"file_sha256\":\"2f543fdbbee9859361fbc74eadc74399439fb2a88fc883c83d87ce037560e09d\",\"content_sha256\":\"a4478fba742802827d50735a80125b0cc7cfbc674f01712d23b7cde1f4dfc471\",\"file_bytes\":1750,\"body_bytes\":663}]"
carrier_sha256: f9fbbb83ec4a8d145df1e4707e97dfd2e811414141fd754ffc2cf5bb67f1ea3b
carrier_bytes: 5758
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-code-review -->
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
  - "\"the complete feedback, read without reacting\""
  - the requirement restated in your own words
  - the verification against the codebase
  - the action taken or the reasoned pushback
artifact_contract_verified_by: every addressed item is listed with the check that proves it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/receiving-code-review/SKILL.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
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

If any item is unclear, stop and implement nothing yet and ask for clarification on the unclear items, because the items may be related and partial understanding leads to a wrong implementation.

A request from your human partner is trusted: implement it once you understand it, still ask when the scope is unclear, and give a technical acknowledgement or go straight to action.

Feedback from an external reviewer needs its own checks before you implement it:
1. Is it technically correct for this codebase?
2. Does it break existing functionality?
3. Is there a reason for the current implementation?
4. Does it work on all platforms and versions?
5. Does the reviewer understand the full context?
If the suggestion seems wrong, push back with technical reasoning. If you cannot verify it easily, say so and ask whether to investigate, ask, or proceed. If it conflicts with a prior decision of your human partner, stop and discuss it with them first.

When a reviewer suggests implementing something properly, check the codebase for actual usage first: if the feature is unused, point that out and offer to remove it; only implement it properly when it is used.

For feedback with several items, implement in this order: blocking issues such as breaks and security problems, then simple fixes such as typos and imports, then complex fixes such as refactoring and logic. Test each fix individually and verify that no regression appeared.

Push back when the suggestion breaks existing functionality, when the reviewer lacks the full context, when it violates the rule that an unused feature is not added, when it is technically incorrect for this stack, when legacy or compatibility reasons exist, or when it conflicts with an architectural decision of your human partner. Push back with technical reasoning rather than defensiveness, ask specific questions, reference the working tests and code, and involve your human partner when the decision is architectural.
<!-- vpmodule:atom:end apply-code-review -->
<!-- vpmodule:atom:begin avoid-performative-review-agreement -->
---
instruction_id: avoid-performative-review-agreement
title: "Answer review feedback with work, not praise"
summary: "Answer correct feedback with a short factual fix, and push back with technical reasoning instead of praise or apology."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: You are preparing a response to review feedback.
conditions_does_not_apply_when: "There is no feedback, or the decision is already settled by evidence."
artifact_contract_output_type: review-response
artifact_contract_required_data:
  - feedback item
  - change or technical argument
  - evidence
artifact_contract_verified_by: "each response states a change or evidence, not praise"
compatibility_excludes: []
compatibility_requires:
  - apply-code-review
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/receiving-code-review/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Answer review feedback with work, not praise
Never say "You're absolutely right!"
Never say "Great point!" or "Excellent feedback!" — that is performative.
Never say "Let me implement that now" before verification.
Instead, restate the technical requirement, ask clarifying questions, push back with technical reasoning if wrong, or just start working.
Actions speak. Just fix it. The code itself shows you heard the feedback.
When feedback is correct, say "Fixed." with a brief description of what changed.
If you pushed back and were wrong, state the correction factually and move on.
Do not add a long apology, defend why you pushed back, or over-explain.
<!-- vpmodule:atom:end avoid-performative-review-agreement -->