---
instruction_id: avoid-over-simplification
title: Watch for over-simplification
summary: "Simplification has a failure mode: inlining too far, merging unrelated logic, dropping useful abstractions, chasing line count."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A simplification is about to remove something that gives a concept its name.
conditions_does_not_apply_when: The removal was already decided and verified by the behaviour check.
artifact_contract_output_type: over-simplification-check
artifact_contract_required_data:
  - the trap checked
  - the abstraction or naming kept
  - the comprehension result
artifact_contract_verified_by: the result is easier to understand than the code before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Watch for over-simplification

Simplification has a failure mode: over-simplification. Watch for these traps:

- **Inlining too aggressively** — removing a helper that gave a concept a name makes the call site harder to read
- **Combining unrelated logic** — two simple functions merged into one complex function is not simpler
- **Removing "unnecessary" abstraction** — some abstractions exist for extensibility or testability, not complexity
- **Optimizing for line count** — fewer lines is not the goal; easier comprehension is
