---
instruction_id: understand-why-the-code-exists-before-simplifying
title: Understand why the code exists before simplifying it
summary: "Before changing or removing anything, find the reason it was written and decide whether that reason still applies."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: "Existing code is about to be changed, removed or inlined."
conditions_does_not_apply_when: The code was written in the current change.
artifact_contract_output_type: fence-assessment
artifact_contract_required_data:
  - the responsibility of the code
  - the reason it was written
  - whether the reason still applies
artifact_contract_verified_by: the questions are answered and the original context was checked before the code changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 1
---

# Understand why the code exists before simplifying it

Before changing or removing anything, understand why it exists. This is Chesterton's Fence: if you see a fence across a road and don't understand why it's there, don't tear it down. First understand the reason, then decide if the reason still applies.

```
BEFORE SIMPLIFYING, ANSWER:
- What is this code's responsibility?
- What calls it? What does it call?
- What are the edge cases and error paths?
- Are there tests that define the expected behavior?
- Why might it have been written this way? (Performance? Platform constraint? Historical reason?)
- Check git blame: what was the original context for this code?
```

If you can't answer these, you're not ready to simplify. Read more context first.

"The original author must have had a reason" | Maybe. Check git blame — apply Chesterton's Fence. But accumulated complexity often has no reason; it's just the residue of iteration under pressure.

Simplifying code you don't fully understand
