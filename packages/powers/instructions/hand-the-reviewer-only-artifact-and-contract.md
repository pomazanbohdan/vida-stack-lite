---
instruction_id: hand-the-reviewer-only-artifact-and-contract
title: Hand the reviewer only the artifact and the contract
summary: Strip your reasoning out of the review request and never pass your own conclusion; hand over the smallest unit and the contract it must satisfy.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: You ask a fresh context to review an artifact.
conditions_does_not_apply_when: The reviewer already holds the same context as you.
artifact_contract_output_type: review-request
artifact_contract_required_data:
  - the artifact
  - the contract
  - the adversarial prompt
  - what was deliberately left out
artifact_contract_verified_by: the reviewer received the artifact and the contract and not the claim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/doubt-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hand the reviewer only the artifact and the contract

A fresh-context reviewer needs the **artifact** and the **contract**, not the journey.

- Code: the diff or the function — not the whole file
- Decision: the proposal in 3–5 sentences plus the constraints it has to satisfy
- Assertion: the claim plus the evidence that supposedly supports it (kept distinct from the Step 1 CLAIM block, which is the orchestrator's hypothesis under scrutiny)

Strip your reasoning. If you hand over conclusions, you'll get back validation of your conclusions. The unit must be small enough that a reviewer can hold it in mind in one read — if it's a 500-line PR, decompose first.

**Pass ARTIFACT + CONTRACT only. Do NOT pass the CLAIM.** Handing the reviewer your conclusion biases it toward agreement. The reviewer must independently determine whether the artifact satisfies the contract.

**The reviewer's prompt must be adversarial.** Framing decides the answer.

```
Adversarial review. Find what is wrong with this artifact.
Assume the author is overconfident. Look for:
- Unstated assumptions
- Edge cases not handled
- Hidden coupling or shared state
- Ways the contract could be violated
- Existing conventions this might break
- Failure modes under unexpected input

Do NOT validate. Do NOT summarize. Find issues, or state
explicitly that you cannot find any after thorough examination.

ARTIFACT: <paste artifact>
CONTRACT: <paste contract>
```

**The adversarial prompt above takes precedence over the persona's default response shape.** Paste the adversarial prompt verbatim into the invocation so it overrides the persona's default. If a persona's response shape can't be overridden cleanly, fall back to a generic subagent with the adversarial prompt.

- "The reviewer will just nitpick" | Only if unscoped. Constrain the prompt to "issues that would make this fail under the contract."
