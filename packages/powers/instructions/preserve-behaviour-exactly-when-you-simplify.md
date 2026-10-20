---
instruction_id: preserve-behaviour-exactly-when-you-simplify
title: Preserve behaviour exactly when you simplify
summary: "Change only how the code expresses itself: the same inputs, outputs, side effects, errors and edge cases must survive."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Any change is made in the name of simplifying existing code.
conditions_does_not_apply_when: The change deliberately alters behaviour and is approved as such.
artifact_contract_output_type: behaviour-check
artifact_contract_required_data:
  - the outputs preserved
  - the error behaviour preserved
  - the side effects preserved
  - the test result
artifact_contract_verified_by: the existing tests pass without modification and the behaviour checklist was answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 1
---

# Preserve behaviour exactly when you simplify

Don't change what the code does — only how it expresses it. All inputs, outputs, side effects, error behavior, and edge cases must remain identical. If you're not sure a simplification preserves behavior, don't make it.

```
ASK BEFORE EVERY CHANGE:
→ Does this produce the same output for every input?
→ Does this maintain the same error behavior?
→ Does this preserve the same side effects and ordering?
→ Do all existing tests still pass without modification?
```

Simplification that requires modifying tests to pass (you likely changed behavior)

Removing error handling because "it makes the code cleaner"
