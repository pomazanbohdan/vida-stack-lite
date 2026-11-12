---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-code-simplification-skill-md-dfea038e-c02"
title: "addy-skills: skills/code-simplification/SKILL.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:skills/code-simplification/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/code-simplification/SKILL.md\"}"
atom_ids:
  - simplify-structure-by-pattern
  - understand-why-the-code-exists-before-simplifying
  - verify-the-simplification-is-an-improvement
atom_count: 3
atoms: "[{\"atom_id\":\"simplify-structure-by-pattern\",\"file_sha256\":\"f2af7e815aa419e6df1d5d8b9aef020e7a6368bb9a087de07845f7808ebafd05\",\"content_sha256\":\"ba1dfc041fd3be8e5d44352f3056d9f6d1a277dd509ce163f729a529bf999389\",\"file_bytes\":1879,\"body_bytes\":792},{\"atom_id\":\"understand-why-the-code-exists-before-simplifying\",\"file_sha256\":\"94048643d352f123d45b0a2d7414c82017623d01fb7b89d5015169a3269f3cd9\",\"content_sha256\":\"06381e9aa58314bc32d1a6b2bba2c1d800ac51882edd30215a49f00426b7216c\",\"file_bytes\":2512,\"body_bytes\":1233},{\"atom_id\":\"verify-the-simplification-is-an-improvement\",\"file_sha256\":\"333f34a39e0636dcf6d4a56934e5baa0ea9a673f8575bc22b325e5ba0b6564ed\",\"content_sha256\":\"898ceba5d532557870ff9b14ad67b1ee1e9bb455feba851edc1389390e36b728\",\"file_bytes\":1608,\"body_bytes\":536}]"
carrier_sha256: d77df0e948beb1a52fc1a161cf3416af9314de3495c6b88b80eb7d8bef2e86f2
carrier_bytes: 6414
revision: 1
status: active
---
<!-- vpmodule:atom:begin simplify-structure-by-pattern -->
---
instruction_id: simplify-structure-by-pattern
title: Simplify structure by the pattern it shows
summary: Recognise the structural patterns of complexity and apply the named simplification each one calls for.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Code shows a structural complexity signal that a named simplification answers.
conditions_does_not_apply_when: The complexity comes from an external constraint that cannot change.
artifact_contract_output_type: structural-simplification
artifact_contract_required_data:
  - the pattern
  - the signal
  - the simplification applied
artifact_contract_verified_by: each recognised pattern has its named simplification applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Simplify structure by the pattern it shows

Scan for these patterns — each one is a concrete signal, not a vague smell:

**Structural complexity:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Deep nesting (3+ levels) | Hard to follow control flow | Extract conditions into guard clauses or helper functions |
| Long functions (50+ lines) | Multiple responsibilities | Split into focused functions with descriptive names |
| Nested ternaries | Requires mental stack to parse | Replace with if/else chains, switch, or lookup objects |
| Boolean parameter flags | `doThing(true, false, true)` | Replace with options objects or separate functions |
| Repeated conditionals | Same `if` check in multiple places | Extract to a well-named predicate function |
<!-- vpmodule:atom:end simplify-structure-by-pattern -->
<!-- vpmodule:atom:begin understand-why-the-code-exists-before-simplifying -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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

If the purpose is unclear, keep it and add a comment noting the uncertainty -- do NOT remove code whose purpose you don't understand. If the plan explicitly says to remove it, still document what it did in the deviation notes.
<!-- vpmodule:atom:end understand-why-the-code-exists-before-simplifying -->
<!-- vpmodule:atom:begin verify-the-simplification-is-an-improvement -->
---
instruction_id: verify-the-simplification-is-an-improvement
title: Verify the simplification is an improvement
summary: Compare before and after as a whole and revert when the simplified version is harder to understand or review.
capability_tags:
  - simplify-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A simplification pass is finished and the result must be judged as a whole.
conditions_does_not_apply_when: The pass is still running.
artifact_contract_output_type: simplification-verdict
artifact_contract_required_data:
  - the before and after comparison
  - the consistency check
  - the verdict
artifact_contract_verified_by: the comparison was done and the verdict is keep or revert
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify the simplification is an improvement

After all simplifications, step back and evaluate the whole:

```
COMPARE BEFORE AND AFTER:
- Is the simplified version genuinely easier to understand?
- Did you introduce any new patterns inconsistent with the codebase?
- Is the diff clean and reviewable?
- Would a teammate approve this change?
```

If the "simplified" version is harder to understand or review, revert. Not every simplification attempt succeeds.

"Simplified" code that is longer and harder to follow than the original
<!-- vpmodule:atom:end verify-the-simplification-is-an-improvement -->